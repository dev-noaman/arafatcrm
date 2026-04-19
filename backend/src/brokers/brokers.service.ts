import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Broker } from "./broker.entity";
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class BrokersService {
  constructor(
    @InjectRepository(Broker)
    private brokersRepo: Repository<Broker>,
  ) {}

  async create(dto: CreateBrokerDto) {
    try {
      const broker = this.brokersRepo.create(dto);
      return await this.brokersRepo.save(broker);
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException("Broker with this email already exists");
      }
      throw error;
    }
  }

  async findAll(pagination: PaginationQueryDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.brokersRepo.findAndCount({
      relations: ["managedBy"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const broker = await this.brokersRepo.findOne({
      where: { id },
      relations: ["managedBy"],
    });

    if (!broker) {
      throw new NotFoundException(`Broker with ID ${id} not found`);
    }

    return broker;
  }

  async update(id: string, dto: UpdateBrokerDto) {
    const broker = await this.findOne(id);
    Object.assign(broker, dto);

    try {
      return await this.brokersRepo.save(broker);
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException("Broker with this email already exists");
      }
      throw error;
    }
  }

  async remove(id: string) {
    const result = await this.brokersRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Broker with ID ${id} not found`);
    }
  }
}
