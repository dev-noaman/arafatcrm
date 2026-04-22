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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { User as UserDecorator, Roles } from "../common/decorators";
import { Role } from "@arafat/shared";

@ApiTags("Clients")
@ApiBearerAuth()
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new client" })
  create(@Body() dto: CreateClientDto, @UserDecorator() user: any) {
    return this.clientsService.create(dto, user.id);
  }

  @Post("bulk")
  @ApiOperation({ summary: "Bulk create clients" })
  bulkCreate(@Body() dtos: CreateClientDto[], @UserDecorator() user: any) {
    return this.clientsService.bulkCreate(dtos, user.id);
  }

  @Get()
  @ApiOperation({ summary: "List all clients with pagination" })
  findAll(@Query() pagination: PaginationQueryDto, @UserDecorator() user: any) {
    return this.clientsService.findAll(pagination, user.id, user.role);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get client by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @UserDecorator() user: any) {
    return this.clientsService.findOne(id, user.id, user.role);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update client" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete client" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }
}
