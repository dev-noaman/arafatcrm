import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { JwtGuard } from "../common/guards";
import { Roles } from "../common/decorators";
import { Role } from "@arafat/shared";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create a new user (admin only)" })
  create(@Body() dto: CreateAdminDto) {
    return this.usersService.createAdmin(dto);
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

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete user (admin only)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
