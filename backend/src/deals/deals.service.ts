import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Deal } from "./deal.entity";
import { User } from "../users/user.entity";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { ScheduleMeetingDto } from "./dto/schedule-meeting.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { TERMINAL_STAGES, DealStatus, DealStage } from "@arafat/shared";
import { AppException } from "../common/exceptions";
import { CalendarService } from "../calendar/calendar.service";

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    @InjectRepository(Deal)
    private dealsRepo: Repository<Deal>,
    private calendarService: CalendarService,
  ) {}

  async create(dto: CreateDealDto, userId: string, userRole: string) {
    const ownerId = userRole === "ADMIN" && dto.ownerId ? dto.ownerId : userId;
    const deal = this.dealsRepo.create({
      ...dto,
      owner: { id: ownerId } as User,
      stage: "NEW",
      stageHistory: ["NEW"],
    });

    if (dto.brokerId && dto.value) {
      const monthlyRent = dto.value / 12;
      deal.commissionAmount = Math.round(monthlyRent * 0.5);
      deal.commissionRate = 50;
    }

    try {
      return await this.dealsRepo.save(deal);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Deal with this title already exists");
      }
      throw error;
    }
  }

  async findAll(
    pagination: PaginationQueryDto,
    filters?: { status?: string; stage?: string },
    userId?: string,
    userRole?: string,
  ) {
    const { page, limit } = pagination;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.stage) {
      where.stage = filters.stage;
    }

    // SALES users see only their own deals
    if (userRole === "SALES" && userId) {
      where.owner = { id: userId };
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

  async findOne(id: string, userId?: string, userRole?: string) {
    const deal = await this.dealsRepo.findOne({
      where: { id },
      relations: ["client", "broker", "owner"],
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // SALES users can only see their own deals (return 404 to not leak existence)
    if (userRole === "SALES" && userId && deal.owner?.id !== userId) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto, userId: string, userRole: string) {
    const deal = await this.findOne(id, userId, userRole);

    // Check ownership or admin role
    if (deal.owner.id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException("Only deal owner or admin can update");
    }

    // Check if stage is locked (terminal stage) - requires confirmation
    if (
      dto.stage &&
      TERMINAL_STAGES.includes(dto.stage as any) &&
      deal.stage !== dto.stage &&
      !dto.confirmTerminal
    ) {
      throw AppException.badRequest(
        "Terminal stage changes require confirmation",
        "DEAL_INVALID_STAGE" as any,
      );
    }

    // Update stage history if stage changed
    if (dto.stage && dto.stage !== deal.stage) {
      deal.stageHistory = [...(deal.stageHistory || []), dto.stage];
    }

    // Auto-update status based on terminal stage
    if (dto.stage) {
      if (dto.stage === "WON") {
        deal.status = "won";
      } else if (dto.stage === "LOST") {
        deal.status = "lost";
      }
    }

    Object.assign(deal, dto);

    // Recalculate commission if value or broker changed
    const effectiveBrokerId = dto.brokerId !== undefined ? dto.brokerId : (deal as any).brokerId;
    const effectiveValue = dto.value !== undefined ? dto.value : Number(deal.value);
    if (effectiveBrokerId && effectiveValue) {
      deal.commissionAmount = Math.round((effectiveValue / 12) * 0.5);
      deal.commissionRate = 50;
    } else if (dto.brokerId === null) {
      deal.commissionAmount = null;
      deal.commissionRate = null;
    }

    try {
      return await this.dealsRepo.save(deal);
    } catch (error: any) {
      if (error.code === "23505") {
        throw new ConflictException("Deal with this title already exists");
      }
      throw error;
    }
  }

  async markAsLost(id: string, reason: string, userId: string, userRole: string) {
    const deal = await this.findOne(id, userId, userRole);

    if (deal.owner.id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException("Only deal owner or admin can mark as lost");
    }

    deal.isLost = true;
    deal.lossReason = reason;
    deal.status = DealStatus.LOST;
    deal.stage = DealStage.LOST;
    if (!deal.stageHistory.includes(DealStage.LOST)) {
      deal.stageHistory = [...deal.stageHistory, DealStage.LOST];
    }

    return this.dealsRepo.save(deal);
  }

  async remove(id: string, userId: string, userRole: string) {
    const deal = await this.findOne(id, userId, userRole);

    if (deal.owner.id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException("Only deal owner or admin can delete");
    }

    const result = await this.dealsRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }
  }

  async findByClient(clientId: string, userId?: string, userRole?: string) {
    const where: any = { client: { id: clientId } };
    if (userRole === "SALES" && userId) {
      where.owner = { id: userId };
    }
    return this.dealsRepo.find({
      where,
      relations: ["client", "broker", "owner"],
      order: { createdAt: "DESC" },
    });
  }

  async findByBroker(brokerId: string, userId?: string, userRole?: string) {
    const where: any = { broker: { id: brokerId } };
    if (userRole === "SALES" && userId) {
      where.owner = { id: userId };
    }
    return this.dealsRepo.find({
      where,
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

  async scheduleMeeting(
    id: string,
    dto: ScheduleMeetingDto,
    userId: string,
    userRole: string,
  ) {
    const deal = await this.findOne(id, userId, userRole);
    if (deal.owner.id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException("Only deal owner or admin can schedule meetings");
    }

    deal.meetingDate = dto.meetingDate;
    deal.meetingTime = dto.meetingTime;
    deal.meetingDuration = 30;
    deal.meetingLocation = dto.meetingLocation;
    deal.meetingNotes = dto.meetingNotes ?? null;

    try {
      const clientName = deal.client?.name ?? "Unknown Client";
      const title = `Meeting: ${clientName} - ${deal.title}`;
      const startDate = new Date(`${dto.meetingDate}T${dto.meetingTime}:00`);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

      if (deal.calendarEventId) {
        await this.calendarService.updateBooking(userId, deal.calendarEventId, {
          title,
          start: startDate,
          end: endDate,
          location: dto.meetingLocation,
          description: dto.meetingNotes,
        });
      } else {
        const bookingId = await this.calendarService.createBooking(userId, {
          title,
          start: startDate,
          end: endDate,
          location: dto.meetingLocation,
          description: dto.meetingNotes,
          clientEmail: deal.client?.email,
          clientName: deal.client?.name,
        });
        if (bookingId) {
          deal.calendarEventId = bookingId;
        }
      }
    } catch (e) {
      this.logger.error("Calendar booking failed", e);
      // Meeting still saved locally
    }

    return this.dealsRepo.save(deal);
  }

  async cancelMeeting(id: string, userId: string, userRole: string) {
    const deal = await this.findOne(id, userId, userRole);
    if (deal.owner.id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException("Only deal owner or admin can cancel meetings");
    }

    if (deal.calendarEventId) {
      try {
        await this.calendarService.cancelBooking(userId, deal.calendarEventId);
      } catch (e) {
        this.logger.error("Calendar cancel failed", e);
        // Still clear locally
      }
    }

    deal.meetingDate = null;
    deal.meetingTime = null;
    deal.meetingDuration = null;
    deal.meetingLocation = null;
    deal.meetingNotes = null;
    deal.calendarEventId = null;

    return this.dealsRepo.save(deal);
  }
}
