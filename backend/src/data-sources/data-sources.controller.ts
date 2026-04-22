import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DataSourcesService } from "./data-sources.service";
import { CreateDataSourceDto } from "./dto/create-data-source.dto";
import { UpdateDataSourceDto } from "./dto/update-data-source.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@arafat/shared";

@ApiTags("Data Sources")
@ApiBearerAuth()
@Controller("data-sources")
export class DataSourcesController {
  constructor(private readonly service: DataSourcesService) {}

  @Get()
  @ApiOperation({ summary: "List all data sources" })
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get data source by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create a data source (admin only)" })
  create(@Body() dto: CreateDataSourceDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update a data source (admin only)" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateDataSourceDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete a data source (admin only)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
