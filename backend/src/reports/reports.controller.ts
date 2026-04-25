import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { Roles } from "../common/decorators/roles.decorator";
import { User } from "../common/decorators";
import { Role } from "@arafat/shared";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("win-loss")
  @ApiOperation({ summary: "Get win/loss report by user" })
  getWinLossReport(@User() user: any) {
    return this.reportsService.getWinLossReport(user.id, user.role);
  }

  @Get("pipeline")
  @ApiOperation({ summary: "Get deal pipeline grouped by stage" })
  getDealPipeline(@User() user: any) {
    return this.reportsService.getDealPipeline(user.id, user.role);
  }

  @Get("broker-performance")
  @ApiOperation({ summary: "Get broker performance report" })
  getBrokerPerformance(@Query("month") month?: string, @User() user?: any) {
    return this.reportsService.getBrokerPerformance(month, user?.id, user?.role);
  }

  @Get("space-type-breakdown")
  @ApiOperation({ summary: "Get deal breakdown by space type" })
  getSpaceTypeBreakdown(@Query("month") month?: string, @User() user?: any) {
    return this.reportsService.getSpaceTypeBreakdown(month, user?.id, user?.role);
  }

  @Get("staff-performance")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get monthly staff performance report (admin only)" })
  getStaffPerformance(@Query("month") month?: string) {
    return this.reportsService.getStaffPerformance(month);
  }
}
