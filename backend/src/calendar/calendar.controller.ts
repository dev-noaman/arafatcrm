import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { CalendarService } from "./calendar.service";
import { Public } from "../common/decorators";

@Controller("calendar")
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

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
    if (!code || !state) {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/profile?calendar=error`,
      );
    }
    try {
      const userId = Buffer.from(state, "base64").toString();
      await this.calendarService.handleCallback(code, userId);
      return res.redirect(
        `${process.env.CORS_ORIGIN}/profile?calendar=connected`,
      );
    } catch {
      return res.redirect(
        `${process.env.CORS_ORIGIN}/profile?calendar=error`,
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
