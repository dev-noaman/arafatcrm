import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Deal } from "../deals/deal.entity";
import { Client } from "../clients/client.entity";
import { Broker } from "../brokers/broker.entity";
import { User } from "../users/user.entity";
import { DashboardStatsDto, RevenueTimeseriesPointDto, ByLocationReportDto, BySourceReportDto } from "@arafat/shared";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Deal) private dealsRepo: Repository<Deal>,
    @InjectRepository(Client) private clientsRepo: Repository<Client>,
    @InjectRepository(Broker) private brokersRepo: Repository<Broker>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [totalClients, totalBrokers, totalDeals, activeDeals] = await Promise.all([
      this.clientsRepo.count(),
      this.brokersRepo.count(),
      this.dealsRepo.count(),
      this.dealsRepo.count({ where: { status: "active", isLost: false } }),
    ]);

    const wonDeals = await this.dealsRepo
      .createQueryBuilder("deal")
      .where('deal.status = :status OR deal.stage = :stage', {
        status: "won",
        stage: "WON",
      })
      .getMany();

    const totalRevenue = wonDeals.reduce((sum, deal) => sum + (deal.commissionAmount || 0), 0);

    const activeValue = await this.dealsRepo
      .createQueryBuilder("deal")
      .where("deal.status = :status", { status: "active" })
      .andWhere("deal.isLost = :isLost", { isLost: false })
      .getMany()
      .then((deals) => deals.reduce((sum, deal) => sum + deal.value, 0));

    return {
      totalClients,
      totalBrokers,
      totalDeals,
      activeDeals,
      totalRevenue,
      activeValue,
    };
  }

  async getRevenueTimeseries(days: number = 30): Promise<RevenueTimeseriesPointDto[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const deals = await this.dealsRepo
      .createQueryBuilder("deal")
      .where("deal.createdAt BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .andWhere("(deal.status = :status OR deal.stage = :stage)", {
        status: "won",
        stage: "WON",
      })
      .orderBy("deal.createdAt", "ASC")
      .getMany();

    // Group by date
    const byDate = new Map<string, number>();
    for (const deal of deals) {
      const date = deal.createdAt.toISOString().split("T")[0];
      byDate.set(date, (byDate.get(date) || 0) + (deal.commissionAmount || 0));
    }

    return Array.from(byDate.entries()).map(([date, revenue]) => ({ date, revenue }));
  }

  async getByLocation(): Promise<ByLocationReportDto[]> {
    const deals = await this.dealsRepo
      .createQueryBuilder("deal")
      .select("deal.location", "location")
      .addSelect("COUNT(deal.id)", "count")
      .addSelect("SUM(deal.value)", "totalValue")
      .where("deal.isLost = :isLost", { isLost: false })
      .groupBy("deal.location")
      .getRawMany();

    return deals.map((d) => ({
      location: d.location,
      count: parseInt(d.count, 10),
      totalValue: parseFloat(d.totalValue) || 0,
    }));
  }

  async getBySource(): Promise<BySourceReportDto[]> {
    const deals = await this.dealsRepo
      .createQueryBuilder("deal")
      .innerJoin("deal.client", "client")
      .select("client.source", "source")
      .addSelect("COUNT(deal.id)", "count")
      .addSelect("SUM(deal.value)", "totalValue")
      .where("deal.isLost = :isLost", { isLost: false })
      .groupBy("client.source")
      .getRawMany();

    return deals.map((d) => ({
      source: d.source,
      count: parseInt(d.count, 10),
      totalValue: parseFloat(d.totalValue) || 0,
    }));
  }
}
