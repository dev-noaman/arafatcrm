import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { google } from "googleapis";
import { ConfigService } from "@nestjs/config";
import { GoogleToken } from "./calendar.entity";
import { User } from "../users/user.entity";

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(GoogleToken)
    private tokenRepo: Repository<GoogleToken>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private config: ConfigService,
  ) {}

  getAuthUrl(): string {
    const oauthClient = this.createOAuthClient();
    return oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      prompt: "consent",
    });
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    const oauthClient = this.createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.refresh_token || !tokens.access_token) {
      throw new Error("Google OAuth did not return required tokens");
    }
    await this.tokenRepo.upsert(
      {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date!),
        scope: tokens.scope ?? undefined,
      },
      ["userId"],
    );
  }

  async handleCallbackAsAdmin(code: string): Promise<void> {
    const admin = await this.userRepo.findOne({ where: { role: "ADMIN" } });
    if (!admin) throw new Error("No admin user found");
    await this.handleCallback(code, admin.id);
  }

  async isConnected(userId: string): Promise<boolean> {
    const count = await this.tokenRepo.count({ where: { userId } });
    return count > 0;
  }

  async getAuthClient(userId: string) {
    const tokenRow = await this.tokenRepo.findOne({ where: { userId } });
    if (!tokenRow) return null;

    const oauthClient = this.createOAuthClient();
    oauthClient.setCredentials({
      access_token: tokenRow.accessToken,
      refresh_token: tokenRow.refreshToken,
      expiry_date: tokenRow.tokenExpiry.getTime(),
    });

    if (tokenRow.tokenExpiry <= new Date()) {
      const { credentials } = await oauthClient.refreshAccessToken();
      tokenRow.accessToken = credentials.access_token!;
      tokenRow.tokenExpiry = new Date(credentials.expiry_date!);
      await this.tokenRepo.save(tokenRow);
      oauthClient.setCredentials(credentials);
    }

    return oauthClient;
  }

  async createEvent(
    userId: string,
    details: {
      title: string;
      start: Date;
      end: Date;
      location?: string;
      description?: string;
    },
  ): Promise<string | null> {
    const auth = await this.getAuthClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth });
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: details.title,
        location: details.location,
        description: details.description,
        start: {
          dateTime: details.start.toISOString(),
          timeZone: "Asia/Qatar",
        },
        end: {
          dateTime: details.end.toISOString(),
          timeZone: "Asia/Qatar",
        },
      },
    });
    return event.data.id ?? null;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    details: {
      title: string;
      start: Date;
      end: Date;
      location?: string;
      description?: string;
    },
  ): Promise<void> {
    const auth = await this.getAuthClient(userId);
    if (!auth) return;

    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: details.title,
        location: details.location,
        description: details.description,
        start: {
          dateTime: details.start.toISOString(),
          timeZone: "Asia/Qatar",
        },
        end: {
          dateTime: details.end.toISOString(),
          timeZone: "Asia/Qatar",
        },
      },
    });
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const auth = await this.getAuthClient(userId);
    if (!auth) return;

    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId });
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get("GOOGLE_CLIENT_ID"),
      this.config.get("GOOGLE_CLIENT_SECRET"),
      this.config.get("GOOGLE_REDIRECT_URI"),
    );
  }
}
