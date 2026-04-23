import { Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { OfficerndService } from "./officernd.service";
import { Roles } from "../common/decorators";
import { Role } from "@arafat/shared";
import { QueryOfficerndSyncDto, AssignRepDto, BulkAssignDto, BulkSendToPipelineDto, QuerySyncRunsDto } from "./dto";

@ApiTags("OfficeRnD")
@ApiBearerAuth()
@Controller("officernd")
@Roles(Role.ADMIN)
export class OfficerndController {
  constructor(private readonly service: OfficerndService) {}

  @Get("sync-status")
  @ApiOperation({ summary: "Get sync status and counts" })
  getSyncStatus() { return this.service.getSyncStatus(); }

  @Get("sync-runs")
  @ApiOperation({ summary: "Get sync run history" })
  getSyncRuns(@Query() query: QuerySyncRunsDto) { return this.service.getSyncRuns(query); }

  @Get("expiring")
  @ApiOperation({ summary: "List expiring companies" })
  getExpiring(@Query() query: QueryOfficerndSyncDto) { return this.service.getExpiringCompanies(query); }

  @Get("sales-reps")
  @ApiOperation({ summary: "List available sales reps" })
  getSalesReps() { return this.service.findSalesReps(); }

  @Post("sync")
  @ApiOperation({ summary: "Trigger manual sync" })
  triggerSync() { return this.service.syncMemberships("MANUAL"); }

  @Patch(":id/assign")
  @ApiOperation({ summary: "Assign sales rep" })
  assign(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AssignRepDto) { return this.service.assignSalesRep(id, dto.userId); }

  @Patch(":id/unassign")
  @ApiOperation({ summary: "Unassign sales rep" })
  unassign(@Param("id", ParseUUIDPipe) id: string) { return this.service.unassign(id); }

  @Post("bulk-assign")
  @ApiOperation({ summary: "Bulk assign sales rep" })
  bulkAssign(@Body() dto: BulkAssignDto) { return this.service.bulkAssign(dto.ids, dto.userId); }

  @Post(":id/send-to-pipeline")
  @ApiOperation({ summary: "Send renewal to pipeline" })
  sendToPipeline(@Param("id", ParseUUIDPipe) id: string) { return this.service.sendToPipeline(id); }

  @Post("bulk-send-to-pipeline")
  @ApiOperation({ summary: "Bulk send to pipeline" })
  bulkSendToPipeline(@Body() dto: BulkSendToPipelineDto) { return this.service.bulkSendToPipeline(dto.ids); }

  @Patch(":id/ignore")
  @ApiOperation({ summary: "Mark as ignored" })
  ignore(@Param("id", ParseUUIDPipe) id: string) { return this.service.ignore(id); }

  @Patch(":id/unignore")
  @ApiOperation({ summary: "Unignore renewal" })
  unignore(@Param("id", ParseUUIDPipe) id: string) { return this.service.unignore(id); }

  @Patch(":id/acknowledge")
  @ApiOperation({ summary: "Acknowledge upstream changes" })
  acknowledge(@Param("id", ParseUUIDPipe) id: string) { return this.service.acknowledgeUpstreamChange(id); }
}
