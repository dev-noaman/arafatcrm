import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Req,
  Res,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { CalendarService } from "./calendar.service";
import { DealsService } from "../deals/deals.service";
import { Public } from "../common/decorators";
import { SetDefaultBookingTypeDto } from "./dto/set-default-booking-type.dto";
import { GenerateBookingLinkDto } from "./dto/generate-booking-link.dto";

@Controller("calendar")
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private dealsService: DealsService,
  ) {}

  @Get("connect")
  getConnectUrl(@Req() req: Request) {
    const userId = (req.user as any).id;
    const url = this.calendarService.getAuthUrl(userId);
    return { url };
  }

  @Public()
  @Get("oauth/callback")
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    const origin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

    if (error) {
      return res.redirect(`${origin}/profile?calendar=error`);
    }

    if (!code || !state) {
      return res.redirect(`${origin}/profile?calendar=error`);
    }

    try {
      await this.calendarService.handleCallback(code, state);
      return res.redirect(`${origin}/profile?calendar=connected`);
    } catch {
      return res.redirect(`${origin}/profile?calendar=error`);
    }
  }

  @Get("status")
  async getStatus(@Req() req: Request) {
    const userId = (req.user as any).id;
    const connected = await this.calendarService.isConnected(userId);
    return { connected };
  }

  @Delete("connect")
  async disconnect(@Req() req: Request) {
    const userId = (req.user as any).id;
    await this.calendarService.disconnect(userId);
    return { success: true };
  }

  @Get("booking-types")
  async getBookingTypes(@Req() req: Request) {
    const userId = (req.user as any).id;
    const types = await this.calendarService.getBookingTypes(userId);
    return types;
  }

  @Put("default-booking-type")
  async setDefaultBookingType(@Req() req: Request, @Body() dto: SetDefaultBookingTypeDto) {
    const userId = (req.user as any).id;
    await this.calendarService.setDefaultBookingType(userId, dto.bookingTypeId);
    return { success: true };
  }

  @Post("booking-link")
  @HttpCode(HttpStatus.OK)
  async generateBookingLink(@Req() req: Request, @Body() dto: GenerateBookingLinkDto) {
    const user = req.user as any; // JwtGuard populates { id, email, role }
    const userId = user.id;
    const userRole = user.role;

    // Validate deal ownership via DealsService (applies SALES scoping)
    const deal = await this.dealsService.findOne(dto.dealId, userId, userRole);

    const url = await this.calendarService.generateBookingLink(
      userId,
      deal.client?.email,
      deal.client?.name,
    );
    return { url };
  }
}
