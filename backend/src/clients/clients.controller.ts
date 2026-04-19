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
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { JwtGuard } from "../common/guards";

@ApiTags("Clients")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new client" })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all clients with pagination" })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.clientsService.findAll(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get client by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update client" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete client" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }
}
