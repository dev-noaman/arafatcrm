import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { CalendarService } from "./calendar.service";
import { Roles, Public } from "../common/decorators";
import { Role } from "@arafat/shared";

@Controller("calendar")
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get("connect")
  @Roles(Role.ADMIN)
  getConnectUrl() {
    const url = this.calendarService.getAuthUrl();
    return { url };
  }

  @Public()
  @Get("oauth/callback")
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/settings?calendar=error`,
      );
    }
    try {
      await this.calendarService.handleCallbackAsAdmin(code);
      return res.redirect(
        `${process.env.CORS_ORIGIN}/settings?calendar=connected`,
      );
    } catch {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/settings?calendar=error`,
      );
    }
  }

  @Get("status")
  async getStatus(@Req() req: Request) {
    const userId = (req.user as any).id;
    const connected = await this.calendarService.isConnected(userId);
    return { connected };
  }
}
