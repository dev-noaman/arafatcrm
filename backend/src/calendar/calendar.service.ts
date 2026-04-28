import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { TidyCalToken } from "./calendar.entity";

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly apiBase = "https://tidycal.com/api/v1";

  constructor(
    @InjectRepository(TidyCalToken)
    private tokenRepo: Repository<TidyCalToken>,
    private config: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  // OAuth helpers
  // ------------------------------------------------------------------

  getAuthUrl(userId: string): string {
    const clientId = this.config.get<string>("TIDYCAL_CLIENT_ID");
    const redirectUri = this.config.get<string>("TIDYCAL_REDIRECT_URI");
    const state = this.signState(userId);

    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri!,
      response_type: "code",
      scope: "read write",
      state,
    });

    return `https://tidycal.com/oauth/authorize?${params.toString()}`;
  }

  private signState(userId: string): string {
    const secret = this.config.get<string>("JWT_SECRET")!;
    const hmac = createHmac("sha256", secret).update(userId).digest("base64url");
    return Buffer.from(`${userId}:${hmac}`).toString("base64url");
  }

  private verifyState(state: string): string | null {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf8");
      const [userId, signature] = decoded.split(":");
      if (!userId || !signature) return null;
      const expected = this.signState(userId);
      if (state !== expected) return null;
      return userId;
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // OAuth callback
  // ------------------------------------------------------------------

  async handleCallback(code: string, state: string): Promise<void> {
    const userId = this.verifyState(state);
    if (!userId) {
      throw new BadRequestException("Invalid OAuth state");
    }

    const clientId = this.config.get<string>("TIDYCAL_CLIENT_ID");
    const clientSecret = this.config.get<string>("TIDYCAL_CLIENT_SECRET");
    const redirectUri = this.config.get<string>("TIDYCAL_REDIRECT_URI");

    const tokenRes = await fetch("https://tidycal.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "unknown");
      throw new BadRequestException(`TidyCal token exchange failed: ${body}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in ?? 3600;

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Fetch user profile for username
    let username: string | null = null;
    try {
      const meRes = await fetch(`${this.apiBase}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        username = me.username ?? me.data?.username ?? null;
      }
    } catch (e) {
      this.logger.error("Failed to fetch TidyCal profile", e);
    }

    // Fetch booking types and default to first one
    let bookingTypeId: string | null = null;
    let bookingTypeSlug: string | null = null;
    try {
      const types = await this.fetchBookingTypesRaw(accessToken);
      if (types.length > 0) {
        bookingTypeId = String(types[0].id);
        bookingTypeSlug = types[0].slug ?? null;
      }
    } catch (e) {
      this.logger.error("Failed to fetch TidyCal booking types", e);
    }

    await this.tokenRepo.upsert(
      {
        userId,
        accessToken,
        refreshToken,
        tokenExpiry,
        username,
        bookingTypeId,
        bookingTypeSlug,
      },
      ["userId"],
    );
  }

  // ------------------------------------------------------------------
  // Connection status
  // ------------------------------------------------------------------

  async isConnected(userId: string): Promise<boolean> {
    const count = await this.tokenRepo.count({ where: { userId } });
    return count > 0;
  }

  async disconnect(userId: string): Promise<void> {
    await this.tokenRepo.delete({ userId });
  }

  // ------------------------------------------------------------------
  // Token management
  // ------------------------------------------------------------------

  private async getValidToken(userId: string): Promise<TidyCalToken | null> {
    const token = await this.tokenRepo.findOne({ where: { userId } });
    if (!token) return null;

    // Token still valid
    if (token.tokenExpiry > new Date()) return token;

    // Refresh
    const clientId = this.config.get<string>("TIDYCAL_CLIENT_ID");
    const clientSecret = this.config.get<string>("TIDYCAL_CLIENT_SECRET");

    try {
      const res = await fetch("https://tidycal.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refreshToken,
        }),
      });

      if (!res.ok) {
        throw new Error(`Refresh failed: ${res.status}`);
      }

      const data = await res.json();
      token.accessToken = data.access_token;
      token.refreshToken = data.refresh_token ?? token.refreshToken;
      token.tokenExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
      await this.tokenRepo.save(token);
      return token;
    } catch (e) {
      this.logger.error(`Token refresh failed for user ${userId}`, e);
      await this.tokenRepo.delete(token.id);
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Booking types
  // ------------------------------------------------------------------

  async getBookingTypes(userId: string): Promise<{ id: string; name: string; slug: string }[]> {
    const token = await this.getValidToken(userId);
    if (!token) return [];
    return this.fetchBookingTypesRaw(token.accessToken);
  }

  private async fetchBookingTypesRaw(accessToken: string): Promise<{ id: string; name: string; slug: string }[]> {
    const res = await fetch(`${this.apiBase}/booking-types`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch booking types: ${res.status}`);
    }

    const data = await res.json();
    // Adjust parsing based on actual TidyCal response shape
    const items = Array.isArray(data) ? data : data.data ?? [];
    return items.map((t: any) => ({
      id: String(t.id),
      name: t.name ?? "Unnamed",
      slug: t.slug ?? "",
    }));
  }

  async setDefaultBookingType(userId: string, bookingTypeId: string): Promise<void> {
    const token = await this.getValidToken(userId);
    if (!token) {
      throw new BadRequestException("TidyCal not connected");
    }

    const types = await this.fetchBookingTypesRaw(token.accessToken);
    const selected = types.find((t) => t.id === bookingTypeId);
    if (!selected) {
      throw new BadRequestException("Invalid booking type");
    }

    token.bookingTypeId = selected.id;
    token.bookingTypeSlug = selected.slug;
    await this.tokenRepo.save(token);
  }

  // ------------------------------------------------------------------
  // Bookings
  // ------------------------------------------------------------------

  async createBooking(
    userId: string,
    details: {
      title: string;
      start: Date;
      end: Date;
      location?: string;
      description?: string;
      clientEmail?: string;
      clientName?: string;
    },
  ): Promise<string | null> {
    const token = await this.getValidToken(userId);
    if (!token) return null;

    try {
      const res = await fetch(`${this.apiBase}/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: details.title,
          start: details.start.toISOString(),
          end: details.end.toISOString(),
          location: details.location,
          description: details.description,
          email: details.clientEmail,
          name: details.clientName,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "unknown");
        throw new Error(`TidyCal createBooking failed: ${res.status} ${body}`);
      }

      const data = await res.json();
      return String(data.id ?? data.data?.id ?? "");
    } catch (e) {
      this.logger.error("createBooking failed", e);
      return null;
    }
  }

  async updateBooking(
    userId: string,
    bookingId: string,
    details: {
      title: string;
      start: Date;
      end: Date;
      location?: string;
      description?: string;
    },
  ): Promise<void> {
    const token = await this.getValidToken(userId);
    if (!token) return;

    try {
      const res = await fetch(`${this.apiBase}/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: details.title,
          start: details.start.toISOString(),
          end: details.end.toISOString(),
          location: details.location,
          description: details.description,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "unknown");
        throw new Error(`TidyCal updateBooking failed: ${res.status} ${body}`);
      }
    } catch (e) {
      this.logger.error("updateBooking failed", e);
    }
  }

  async cancelBooking(userId: string, bookingId: string): Promise<void> {
    const token = await this.getValidToken(userId);
    if (!token) return;

    try {
      const res = await fetch(`${this.apiBase}/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "unknown");
        throw new Error(`TidyCal cancelBooking failed: ${res.status} ${body}`);
      }
    } catch (e) {
      this.logger.error("cancelBooking failed", e);
    }
  }

  // ------------------------------------------------------------------
  // Booking link
  // ------------------------------------------------------------------

  async generateBookingLink(
    userId: string,
    clientEmail?: string,
    clientName?: string,
  ): Promise<string> {
    const token = await this.tokenRepo.findOne({ where: { userId } });
    if (!token?.username || !token?.bookingTypeSlug) {
      throw new BadRequestException("TidyCal profile not fully configured. Please reconnect.");
    }

    const params = new URLSearchParams();
    if (clientEmail) params.set("email", clientEmail);
    if (clientName) params.set("name", clientName);

    const query = params.toString();
    return `https://tidycal.com/${token.username}/${token.bookingTypeSlug}${query ? `?${query}` : ""}`;
  }
}
