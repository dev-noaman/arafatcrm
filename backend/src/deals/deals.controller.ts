import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DealsService } from "./deals.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { MarkLostDto } from "./dto/mark-lost.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

import { User, Roles } from "../common/decorators";
import { Role } from "@arafat/shared";

@ApiTags("Deals")
@ApiBearerAuth()
@Controller("deals")
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new deal" })
  create(@Body() dto: CreateDealDto, @User() user: any) {
    return this.dealsService.create(dto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: "List all deals with pagination and filters" })
  findAll(@Query() pagination: PaginationQueryDto, @User() user: any) {
    return this.dealsService.findAll(pagination, { status: pagination.status, stage: pagination.stage }, user.id, user.role);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get deal by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @User() user: any) {
    return this.dealsService.findOne(id, user.id, user.role);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update deal" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDealDto, @User() user: any) {
    return this.dealsService.update(id, dto, user.id, user.role);
  }

  @Post(":id/mark-lost")
  @ApiOperation({ summary: "Mark deal as lost" })
  @HttpCode(HttpStatus.OK)
  markAsLost(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MarkLostDto,
    @User() user: any,
  ) {
    return this.dealsService.markAsLost(id, dto.reason, user.id, user.role);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete deal" })
  remove(@Param("id", ParseUUIDPipe) id: string, @User() user: any) {
    return this.dealsService.remove(id, user.id, user.role);
  }

  @Get("client/:clientId")
  @ApiOperation({ summary: "Find deals by client" })
  findByClient(@Param("clientId", ParseUUIDPipe) clientId: string, @User() user: any) {
    return this.dealsService.findByClient(clientId, user.id, user.role);
  }

  @Get("broker/:brokerId")
  @ApiOperation({ summary: "Find deals by broker" })
  findByBroker(@Param("brokerId", ParseUUIDPipe) brokerId: string, @User() user: any) {
    return this.dealsService.findByBroker(brokerId, user.id, user.role);
  }

  @Get("owner/:ownerId")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Find deals by owner" })
  findByOwner(
    @Param("ownerId", ParseUUIDPipe) ownerId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.dealsService.findByOwner(ownerId, pagination);
  }
}
