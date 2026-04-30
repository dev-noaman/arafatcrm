import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OfficerndSync } from "../officernd/entities/officernd-sync.entity";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";

@Injectable()
export class OfficerndReportsService {
  constructor(
    @InjectRepository(OfficerndSync) private syncRepo: Repository<OfficerndSync>,
    @InjectRepository(Deal) private dealsRepo: Repository<Deal>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async getLifecycleSummary() {
    const rows = await this.syncRepo
      .createQueryBuilder("s")
      .select("s.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("s.status")
      .getRawMany();
    const out = { pending: 0, assigned: 0, pipelined: 0, ignored: 0 };
    for (const r of rows) {
      const k = r.status.toLowerCase() as keyof typeof out;
      out[k] = parseInt(r.count, 10);
    }
    return out;
  }

  async getByType() {
    const rows = await this.syncRepo
      .createQueryBuilder("s")
      .select("s.membershipTypeClass", "type")
      .addSelect("COUNT(*)", "count")
      .where("s.status != :ignored", { ignored: "IGNORED" })
      .groupBy("s.membershipTypeClass")
      .getRawMany();
    return rows.map((r) => ({ type: r.type ?? "OTHERS", count: parseInt(r.count, 10) }));
  }

  async getAssignedByStaff() {
    const rows = await this.syncRepo
      .createQueryBuilder("s")
      .leftJoin("s.assignedUser", "u")
      .select("u.id", "userId")
      .addSelect("u.name", "userName")
      .addSelect("u.email", "userEmail")
      .addSelect("COUNT(*)", "count")
      .where("s.status != :pending", { pending: "PENDING" })
      .andWhere("s.assignedTo IS NOT NULL")
      .groupBy("u.id")
      .addGroupBy("u.name")
      .addGroupBy("u.email")
      .getRawMany();
    return rows.map((r) => ({ userId: r.userId, userName: r.userName ?? r.userEmail, count: parseInt(r.count, 10) }));
  }

  async getReportStaffSummary(month?: string) {
    const qb = this.syncRepo
      .createQueryBuilder("s")
      .leftJoin("s.assignedUser", "u")
      .leftJoin("s.deal", "d")
      .where("s.assigned_to IS NOT NULL");

    if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      qb.andWhere("s.created_at >= :start AND s.created_at < :end", { start, end });
    }

    const rows = await qb
      .select("u.id", "userId")
      .addSelect("u.name", "userName")
      .addSelect("u.email", "userEmail")
      .addSelect(`SUM(CASE WHEN s.status IN ('ASSIGNED','PIPELINED') THEN 1 ELSE 0 END)`, "assigned")
      .addSelect(`SUM(CASE WHEN s.status = 'PIPELINED' THEN 1 ELSE 0 END)`, "pipelined")
      .addSelect(`SUM(CASE WHEN d.status = 'won' OR d.stage = 'WON' THEN 1 ELSE 0 END)`, "won")
      .addSelect(`SUM(CASE WHEN d.status = 'lost' OR d.stage = 'LOST' THEN 1 ELSE 0 END)`, "lost")
      .groupBy("u.id").addGroupBy("u.name").addGroupBy("u.email")
      .getRawMany();

    return rows.map((r) => {
      const won = parseInt(r.won, 10) || 0;
      const lost = parseInt(r.lost, 10) || 0;
      return {
        userId: r.userId,
        userName: r.userName ?? r.userEmail,
        assigned: parseInt(r.assigned, 10) || 0,
        pipelined: parseInt(r.pipelined, 10) || 0,
        won, lost,
        winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
      };
    });
  }

  async getDashboardWinLoss() {
    const rows = await this.dealsRepo
      .createQueryBuilder("d")
      .select(
        `SUM(CASE WHEN d.status = 'won' OR d.stage = 'WON' THEN 1 ELSE 0 END)`,
        "won",
      )
      .addSelect(
        `SUM(CASE WHEN d.status = 'lost' OR d.stage = 'LOST' THEN 1 ELSE 0 END)`,
        "lost",
      )
      .addSelect(
        `SUM(CASE WHEN d.status = 'active' AND d.stage NOT IN ('WON', 'LOST') THEN 1 ELSE 0 END)`,
        "active",
      )
      .where("d.officerndSyncId IS NOT NULL")
      .getRawOne();
    const won = parseInt(rows?.won ?? "0", 10);
    const lost = parseInt(rows?.lost ?? "0", 10);
    const active = parseInt(rows?.active ?? "0", 10);
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0;
    return { won, lost, active, winRate };
  }
}
