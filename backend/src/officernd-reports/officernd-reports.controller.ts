import { Controller, Get } from "@nestjs/common";
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
}
