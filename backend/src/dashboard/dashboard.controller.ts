import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { User } from "../common/decorators";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get dashboard statistics" })
  getStats(@User() user: any) {
    return this.dashboardService.getStats(user.id, user.role);
  }

  @Get("revenue-timeseries")
  @ApiOperation({ summary: "Get revenue timeseries data" })
  getRevenueTimeseries(@Query("days") days?: number, @User() user?: any) {
    return this.dashboardService.getRevenueTimeseries(days || 30, user?.id, user?.role);
  }

  @Get("by-location")
  @ApiOperation({ summary: "Get deals grouped by location" })
  getByLocation(@User() user: any) {
    return this.dashboardService.getByLocation(user.id, user.role);
  }

  @Get("by-source")
  @ApiOperation({ summary: "Get deals grouped by client source" })
  getBySource(@User() user: any) {
    return this.dashboardService.getBySource(user.id, user.role);
  }
}
