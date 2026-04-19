import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { JwtGuard } from "../common/guards";

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtGuard)
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
  getBrokerPerformance() {
    return this.reportsService.getBrokerPerformance();
  }
}
