import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { CreateAdminDto } from "./dto/create-admin.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepo.find({ order: { createdAt: "DESC" } });
  }

  findOne(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async createAdmin(dto: CreateAdminDto) {
    const user = this.usersRepo.create(dto);
    return this.usersRepo.save(user);
  }

  async remove(id: string) {
    const result = await this.usersRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
