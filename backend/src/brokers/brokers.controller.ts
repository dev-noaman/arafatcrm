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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BrokersService } from "./brokers.service";
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { JwtGuard } from "../common/guards";

@ApiTags("Brokers")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("brokers")
export class BrokersController {
  constructor(private readonly brokersService: BrokersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new broker" })
  create(@Body() dto: CreateBrokerDto) {
    return this.brokersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all brokers with pagination" })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.brokersService.findAll(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get broker by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.brokersService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update broker" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateBrokerDto) {
    return this.brokersService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete broker" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.brokersService.remove(id);
  }
}
