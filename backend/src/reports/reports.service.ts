import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";
import { WinLossReportDto } from "@arafat/shared";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Deal) private dealsRepo: Repository<Deal>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async getWinLossReport(): Promise<WinLossReportDto[]> {
    const deals = await this.dealsRepo.find({
      where: { isLost: true },
      relations: ["owner", "client", "broker"],
    });

    const report = new Map<string, { won: number; lost: number; totalValue: number }>();

    for (const deal of deals) {
      const key = deal.owner.id;
      if (!report.has(key)) {
        report.set(key, { won: 0, lost: 0, totalValue: 0 });
      }
      const entry = report.get(key)!;
      entry.lost += 1;
      entry.totalValue += deal.value;
    }

    // Also count won deals
    const wonDeals = await this.dealsRepo.find({
      where: { status: "won" },
      relations: ["owner"],
    });

    for (const deal of wonDeals) {
      const key = deal.owner.id;
      if (!report.has(key)) {
        report.set(key, { won: 0, lost: 0, totalValue: 0 });
      }
      const entry = report.get(key)!;
      entry.won += 1;
    }

    return Array.from(report.entries()).map(([userId, data]) => ({
      userId,
      won: data.won,
      lost: data.lost,
      winRate: data.won + data.lost > 0 ? (data.won / (data.won + data.lost)) * 100 : 0,
      totalValue: data.totalValue,
    }));
  }

  async getDealPipeline() {
    const deals = await this.dealsRepo.find({
      where: { isLost: false },
      relations: ["client", "broker", "owner"],
      order: { stage: "ASC" },
    });

    const byStage = new Map<string, any[]>();
    for (const deal of deals) {
      if (!byStage.has(deal.stage)) {
        byStage.set(deal.stage, []);
      }
      byStage.get(deal.stage)!.push(deal);
    }

    return Array.from(byStage.entries()).map(([stage, deals]) => ({
      stage,
      count: deals.length,
      totalValue: deals.reduce((sum, d) => sum + d.value, 0),
      deals,
    }));
  }

  async getBrokerPerformance() {
    const deals = await this.dealsRepo.find({
      relations: ["broker", "owner"],
    });

    const byBroker = new Map<string, { totalDeals: number; totalValue: number; totalCommission: number }>();

    for (const deal of deals) {
      if (!deal.broker) continue;
      const key = deal.broker.id;
      if (!byBroker.has(key)) {
        byBroker.set(key, { totalDeals: 0, totalValue: 0, totalCommission: 0 });
      }
      const entry = byBroker.get(key)!;
      entry.totalDeals += 1;
      entry.totalValue += deal.value;
      entry.totalCommission += deal.commissionAmount || 0;
    }

    return Array.from(byBroker.entries()).map(([brokerId, data]) => ({
      brokerId,
      totalDeals: data.totalDeals,
      totalValue: data.totalValue,
      totalCommission: data.totalCommission,
    }));
  }
}
