import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@arafat/shared";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("win-loss")
  @ApiOperation({ summary: "Get win/loss report by user" })
  getWinLossReport() {
    return this.reportsService.getWinLossReport();
  }

  @Get("pipeline")
  @ApiOperation({ summary: "Get deal pipeline grouped by stage" })
  getDealPipeline() {
    return this.reportsService.getDealPipeline();
  }

  @Get("broker-performance")
  @ApiOperation({ summary: "Get broker performance report" })
  getBrokerPerformance(@Query("month") month?: string) {
    return this.reportsService.getBrokerPerformance(month);
  }

  @Get("space-type-breakdown")
  @ApiOperation({ summary: "Get deal breakdown by space type" })
  getSpaceTypeBreakdown(@Query("month") month?: string) {
    return this.reportsService.getSpaceTypeBreakdown(month);
  }

  @Get("staff-performance")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get monthly staff performance report (admin only)" })
  getStaffPerformance(@Query("month") month?: string) {
    return this.reportsService.getStaffPerformance(month);
  }
}
