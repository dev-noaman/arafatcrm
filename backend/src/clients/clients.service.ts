import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Client } from "./client.entity";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepo: Repository<Client>,
  ) {}

  async create(dto: CreateClientDto) {
    try {
      const client = this.clientsRepo.create(dto);
      return await this.clientsRepo.save(client);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Client with this email already exists");
      }
      throw error;
    }
  }

  async bulkCreate(dtos: CreateClientDto[]) {
    const results = { created: 0, errors: [] as { row: number; message: string }[] };
    for (let i = 0; i < dtos.length; i++) {
      try {
        const client = this.clientsRepo.create(dtos[i]);
        await this.clientsRepo.save(client);
        results.created++;
      } catch (error: any) {
        results.errors.push({ row: i + 1, message: error.code === "23505" ? "Email already exists" : error.message });
      }
    }
    return results;
  }

  async findAll(pagination: PaginationQueryDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.clientsRepo.findAndCount({
      relations: ["assignedTo"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const client = await this.clientsRepo.findOne({
      where: { id },
      relations: ["assignedTo"],
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.findOne(id);
    Object.assign(client, dto);

    try {
      return await this.clientsRepo.save(client);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Client with this email already exists");
      }
      throw error;
    }
  }

  async remove(id: string) {
    const result = await this.clientsRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
  }
}
