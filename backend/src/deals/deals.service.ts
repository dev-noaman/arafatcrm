import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Deal } from "./deal.entity";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { TERMINAL_STAGES, DealStatus } from "@arafat/shared";
import { AppException } from "../common/exceptions";
import { ErrorCodes } from "../common/errors/error-codes";

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private dealsRepo: Repository<Deal>,
  ) {}

  async create(dto: CreateDealDto, userId: string) {
    const deal = this.dealsRepo.create({
      ...dto,
      ownerId: userId,
      stageHistory: ["lead"],
    });

    try {
      return await this.dealsRepo.save(deal);
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException("Deal with this title already exists");
      }
      throw error;
    }
  }

  async findAll(pagination: PaginationQueryDto, filters?: { status?: string; stage?: string }) {
    const { page, limit } = pagination;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.stage) {
      where.stage = filters.stage;
    }

    const [data, total] = await this.dealsRepo.findAndCount({
      where,
      relations: ["client", "broker", "owner"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const deal = await this.dealsRepo.findOne({
      where: { id },
      relations: ["client", "broker", "owner"],
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto, userId: string, userRole: string) {
    const deal = await this.findOne(id);

    // Check ownership or admin role
    if (deal.owner.id !== userId && userRole !== "admin") {
      throw new ForbiddenException("Only deal owner or admin can update");
    }

    // Check if stage is locked (terminal stage)
    if (dto.stage && TERMINAL_STAGES.includes(dto.stage as any) && deal.stage !== dto.stage) {
      throw AppException.badRequest(
        "Terminal stage changes require confirmation",
        ErrorCodes.TERMINAL_CONFIRMATION_REQUIRED,
      );
    }

    // Update stage history if stage changed
    if (dto.stage && dto.stage !== deal.stage) {
      deal.stageHistory = [...(deal.stageHistory || []), dto.stage];
    }

    // Calculate commission amount if rate changed
    if (dto.commissionRate !== undefined && dto.value !== undefined) {
      dto.commissionAmount = (dto.value * dto.commissionRate) / 100;
    } else if (dto.commissionRate !== undefined) {
      dto.commissionAmount = (deal.value * dto.commissionRate) / 100;
    }

    Object.assign(deal, dto);

    try {
      return await this.dealsRepo.save(deal);
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException("Deal with this title already exists");
      }
      throw error;
    }
  }

  async markAsLost(id: string, reason: string, userId: string, userRole: string) {
    const deal = await this.findOne(id);

    if (deal.owner.id !== userId && userRole !== "admin") {
      throw new ForbiddenException("Only deal owner or admin can mark as lost");
    }

    deal.isLost = true;
    deal.lossReason = reason;
    deal.status = DealStatus.LOST;

    return this.dealsRepo.save(deal);
  }

  async remove(id: string, userId: string, userRole: string) {
    const deal = await this.findOne(id);

    if (deal.owner.id !== userId && userRole !== "admin") {
      throw new ForbiddenException("Only deal owner or admin can delete");
    }

    const result = await this.dealsRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }
  }

  async findByClient(clientId: string) {
    return this.dealsRepo.find({
      where: { client: { id: clientId } },
      relations: ["client", "broker", "owner"],
      order: { createdAt: "DESC" },
    });
  }

  async findByBroker(brokerId: string) {
    return this.dealsRepo.find({
      where: { broker: { id: brokerId } },
      relations: ["client", "broker", "owner"],
      order: { createdAt: "DESC" },
    });
  }

  async findByOwner(ownerId: string, pagination?: PaginationQueryDto) {
    if (pagination) {
      const { page, limit } = pagination;
      const [data, total] = await this.dealsRepo.findAndCount({
        where: { owner: { id: ownerId } },
        relations: ["client", "broker", "owner"],
        order: { createdAt: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { data, total, page, limit };
    }

    return this.dealsRepo.find({
      where: { owner: { id: ownerId } },
      relations: ["client", "broker", "owner"],
      order: { createdAt: "DESC" },
    });
  }
}
