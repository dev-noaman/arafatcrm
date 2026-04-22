import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Todo } from "./todo.entity";
import { TodosService } from "./todos.service";
import { TodosController } from "./todos.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Todo]), AuthModule],
  providers: [TodosService],
  controllers: [TodosController],
  exports: [TodosService],
})
export class TodosModule {}
