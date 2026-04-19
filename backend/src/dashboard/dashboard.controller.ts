import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtGuard } from "../common/guards";

@ApiTags("Dashboard")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get dashboard statistics" })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get("revenue-timeseries")
  @ApiOperation({ summary: "Get revenue timeseries data" })
  getRevenueTimeseries(@Query("days") days?: number) {
    return this.dashboardService.getRevenueTimeseries(days || 30);
  }

  @Get("by-location")
  @ApiOperation({ summary: "Get deals grouped by location" })
  getByLocation() {
    return this.dashboardService.getByLocation();
  }

  @Get("by-source")
  @ApiOperation({ summary: "Get deals grouped by client source" })
  getBySource() {
    return this.dashboardService.getBySource();
  }
}
