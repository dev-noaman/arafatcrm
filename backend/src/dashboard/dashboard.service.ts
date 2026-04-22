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

    const lostDeals = await this.dealsRepo
      .createQueryBuilder("deal")
      .where('deal.status = :status OR deal.stage = :stage', {
        status: "lost",
        stage: "LOST",
      })
      .getMany();

    const totalRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.commissionAmount || 0), 0);
    const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

    return {
      totalDeals,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      revenueQar: totalRevenue.toFixed(2),
      conversionRate: Math.round(conversionRate * 100) / 100,
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

    // Group by date (bucket)
    const byDate = new Map<string, { revenue: number; count: number }>();
    for (const deal of deals) {
      const date = deal.createdAt.toISOString().split("T")[0];
      const existing = byDate.get(date) || { revenue: 0, count: 0 };
      byDate.set(date, {
        revenue: existing.revenue + Number(deal.commissionAmount || 0),
        count: existing.count + 1,
      });
    }

    return Array.from(byDate.entries()).map(([bucket, data]) => ({
      bucket,
      revenueQar: data.revenue.toFixed(2),
      wonCount: data.count,
    }));
  }

  async getByLocation(): Promise<ByLocationReportDto[]> {
    const deals = await this.dealsRepo
      .createQueryBuilder("deal")
      .select("deal.location", "location")
      .addSelect("COUNT(deal.id)", "count")
      .addSelect("SUM(CASE WHEN deal.status = 'won' OR deal.stage = 'WON' THEN 1 ELSE 0 END)", "wonCount")
      .addSelect("SUM(CASE WHEN deal.status = 'lost' OR deal.stage = 'LOST' THEN 1 ELSE 0 END)", "lostCount")
      .where("deal.isLost = :isLost OR deal.status != :activeStatus", { isLost: false, activeStatus: "active" })
      .groupBy("deal.location")
      .getRawMany();

    return deals.map((d) => ({
      location: d.location,
      won: parseInt(d.wonCount, 10) || 0,
      lost: parseInt(d.lostCount, 10) || 0,
    }));
  }

  async getBySource(): Promise<BySourceReportDto[]> {
    const deals = await this.dealsRepo
      .createQueryBuilder("deal")
      .innerJoin("deal.client", "client")
      .select("client.source", "source")
      .addSelect("COUNT(deal.id)", "count")
      .addSelect("SUM(CASE WHEN deal.status = 'won' OR deal.stage = 'WON' THEN 1 ELSE 0 END)", "wonCount")
      .addSelect("SUM(CASE WHEN deal.status = 'lost' OR deal.stage = 'LOST' THEN 1 ELSE 0 END)", "lostCount")
      .where("deal.isLost = :isLost OR deal.status != :activeStatus", { isLost: false, activeStatus: "active" })
      .groupBy("client.source")
      .getRawMany();

    return deals.map((d) => ({
      source: d.source,
      won: parseInt(d.wonCount, 10) || 0,
      lost: parseInt(d.lostCount, 10) || 0,
    }));
  }
}
