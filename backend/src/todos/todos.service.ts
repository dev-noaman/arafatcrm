import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Todo } from "./todo.entity";
import { CreateTodoDto, UpdateTodoDto } from "./dto";

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private todosRepo: Repository<Todo>,
  ) {}

  async findAll(userId: string): Promise<Todo[]> {
    return this.todosRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async create(dto: CreateTodoDto, userId: string): Promise<Todo> {
    const todo = this.todosRepo.create({ ...dto, userId });
    return this.todosRepo.save(todo);
  }

  async update(id: string, dto: UpdateTodoDto, userId: string): Promise<Todo> {
    const todo = await this.todosRepo.findOne({ where: { id, userId } });
    if (!todo) throw new NotFoundException("Todo not found");
    Object.assign(todo, dto);
    return this.todosRepo.save(todo);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.todosRepo.delete({ id, userId });
    if (result.affected === 0) throw new NotFoundException("Todo not found");
  }
}
