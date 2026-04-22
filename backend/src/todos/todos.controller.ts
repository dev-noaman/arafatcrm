import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { TodosService } from "./todos.service";
import { CreateTodoDto, UpdateTodoDto } from "./dto";
import { User } from "../common/decorators";

@ApiTags("Todos")
@ApiBearerAuth()
@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's todos" })
  findAll(@User() user: any) {
    return this.todosService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Create a todo" })
  create(@Body() dto: CreateTodoDto, @User() user: any) {
    return this.todosService.create(dto, user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a todo" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
    @User() user: any,
  ) {
    return this.todosService.update(id, dto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a todo" })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string, @User() user: any) {
    return this.todosService.remove(id, user.id);
  }
}
