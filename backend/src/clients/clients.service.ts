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

  async create(dto: CreateClientDto, userId: string) {
    try {
      const client = this.clientsRepo.create({ ...dto, createdBy: { id: userId } as any });
      return await this.clientsRepo.save(client);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Client with this email already exists");
      }
      throw error;
    }
  }

  async bulkCreate(dtos: CreateClientDto[], userId: string) {
    const results = { created: 0, errors: [] as { row: number; message: string }[] };
    for (let i = 0; i < dtos.length; i++) {
      try {
        const client = this.clientsRepo.create({ ...dtos[i], createdBy: { id: userId } as any });
        await this.clientsRepo.save(client);
        results.created++;
      } catch (error: any) {
        results.errors.push({ row: i + 1, message: error.code === "23505" ? "Email already exists" : error.message });
      }
    }
    return results;
  }

  async findAll(pagination: PaginationQueryDto, userId?: string, userRole?: string) {
    const { page, limit } = pagination;

    if (userRole === "SALES" && userId) {
      // SALES sees only their own clients
      const qb = this.clientsRepo.createQueryBuilder("client")
        .leftJoinAndSelect("client.assignedTo", "assignedTo")
        .leftJoinAndSelect("client.createdBy", "createdBy")
        .where("client.created_by = :userId", { userId })
        .orderBy("client.createdAt", "DESC")
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page, limit };
    }

    // ADMIN — no filter
    const [data, total] = await this.clientsRepo.findAndCount({
      relations: ["assignedTo", "createdBy"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const client = await this.clientsRepo.findOne({
      where: { id },
      relations: ["assignedTo", "createdBy"],
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    // SALES users can only see their own clients
    if (userRole === "SALES" && userId && client.createdById !== userId) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.clientsRepo.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
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
