import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { BulkCreateUsersDto } from "./dto/bulk-create-users.dto";
import { Roles } from "../common/decorators";
import { Role } from "@arafat/shared";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create a new user (admin only)" })
  create(@Body() dto: CreateAdminDto) {
    return this.usersService.createAdmin(dto);
  }

  @Post("bulk")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Bulk create users from CSV data (admin only)" })
  bulkCreate(@Body() dto: BulkCreateUsersDto) {
    return this.usersService.bulkCreate(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "List all users (admin only)" })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get user by ID (admin only)" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update user (admin only)" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete user (admin only)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
