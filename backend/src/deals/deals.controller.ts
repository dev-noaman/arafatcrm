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
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DealsService } from "./deals.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { JwtGuard } from "../common/guards";
import { User } from "../common/decorators";

@ApiTags("Deals")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("deals")
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new deal" })
  create(@Body() dto: CreateDealDto, @User() user: any) {
    return this.dealsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "List all deals with pagination and filters" })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query("status") status?: string,
    @Query("stage") stage?: string,
  ) {
    return this.dealsService.findAll(pagination, { status, stage });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get deal by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.dealsService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update deal" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDealDto, @User() user: any) {
    return this.dealsService.update(id, dto, user.id, user.role);
  }

  @Post(":id/mark-lost")
  @ApiOperation({ summary: "Mark deal as lost" })
  markAsLost(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("reason") reason: string,
    @User() user: any,
  ) {
    return this.dealsService.markAsLost(id, reason, user.id, user.role);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete deal" })
  remove(@Param("id", ParseUUIDPipe) id: string, @User() user: any) {
    return this.dealsService.remove(id, user.id, user.role);
  }

  @Get("client/:clientId")
  @ApiOperation({ summary: "Find deals by client" })
  findByClient(@Param("clientId", ParseUUIDPipe) clientId: string) {
    return this.dealsService.findByClient(clientId);
  }

  @Get("broker/:brokerId")
  @ApiOperation({ summary: "Find deals by broker" })
  findByBroker(@Param("brokerId", ParseUUIDPipe) brokerId: string) {
    return this.dealsService.findByBroker(brokerId);
  }

  @Get("owner/:ownerId")
  @ApiOperation({ summary: "Find deals by owner" })
  findByOwner(
    @Param("ownerId", ParseUUIDPipe) ownerId: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.dealsService.findByOwner(ownerId, pagination);
  }
}
