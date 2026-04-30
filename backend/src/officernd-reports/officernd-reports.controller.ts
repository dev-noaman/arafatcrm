import { Controller } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@arafat/shared";
import { OfficerndReportsService } from "./officernd-reports.service";

@ApiTags("OfficeRnD Reports")
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class OfficerndReportsController {
  constructor(private readonly service: OfficerndReportsService) {}
}
