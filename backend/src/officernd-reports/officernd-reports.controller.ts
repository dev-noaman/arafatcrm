import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@arafat/shared";
import { OfficerndReportsService } from "./officernd-reports.service";

@ApiTags("OfficeRnD Reports")
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class OfficerndReportsController {
  constructor(private readonly service: OfficerndReportsService) {}

  @Get("dashboard/officernd/lifecycle-summary")
  @ApiOperation({ summary: "OfficeRnD sync row counts grouped by lifecycle status" })
  getLifecycleSummary() {
    return this.service.getLifecycleSummary();
  }

  @Get("dashboard/officernd/by-type")
  @ApiOperation({ summary: "OfficeRnD sync rows grouped by membership type class (excludes IGNORED)" })
  getByType() {
    return this.service.getByType();
  }

  @Get("dashboard/officernd/assigned-by-staff")
  @ApiOperation({ summary: "Counts of non-PENDING OfficeRnD rows per assigned user" })
  getAssignedByStaff() {
    return this.service.getAssignedByStaff();
  }

  @Get("dashboard/officernd/win-loss")
  @ApiOperation({ summary: "Won/lost/active counts and win rate for OfficeRnD deals" })
  getDashboardWinLoss() {
    return this.service.getDashboardWinLoss();
  }

  @Get("reports/officernd/staff-summary")
  @ApiOperation({ summary: "Per-staff OfficeRnD breakdown (filterable by month on sync.created_at)" })
  getReportStaffSummary(@Query("month") month?: string) {
    return this.service.getReportStaffSummary(month);
  }

  @Get("reports/officernd/type-summary")
  @ApiOperation({ summary: "Membership type breakdown counts (filterable by month)" })
  getReportTypeSummary(@Query("month") month?: string) {
    return this.service.getReportTypeSummary(month);
  }

  @Get("reports/officernd/win-loss")
  @ApiOperation({ summary: "Per-staff win/loss for OfficeRnD deals (filterable by month on sync.created_at)" })
  getReportWinLoss(@Query("month") month?: string) {
    return this.service.getReportWinLoss(month);
  }
}
