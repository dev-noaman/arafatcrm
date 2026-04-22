import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "./user.entity";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { BulkCreateUsersDto } from "./dto/bulk-create-users.dto";

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
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      ...dto,
      password: hashedPassword,
    });
    return this.usersRepo.save(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    if ((dto as any).password) {
      (dto as any).password = await bcrypt.hash((dto as any).password, 10);
    }

    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async remove(id: string) {
    const result = await this.usersRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async bulkCreate(dto: BulkCreateUsersDto) {
    const errors: string[] = [];
    const created: User[] = [];

    for (let i = 0; i < dto.users.length; i++) {
      const row = dto.users[i];
      const existing = await this.usersRepo.findOne({ where: { email: row.email } });
      if (existing) {
        errors.push(`Row ${i + 1}: Email "${row.email}" already exists`);
        continue;
      }
      const hashedPassword = await bcrypt.hash(row.password, 10);
      const user = this.usersRepo.create({
        email: row.email,
        password: hashedPassword,
        name: row.name,
        role: row.role || "SALES",
      });
      created.push(await this.usersRepo.save(user));
    }

    return { created: created.length, errors, users: created };
  }
}
