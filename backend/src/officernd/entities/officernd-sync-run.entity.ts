import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("officernd_sync_runs")
export class OfficerndSyncRun extends BaseEntity {
  @Column({ name: "started_at", type: "timestamptz" })
  startedAt: Date = new Date();

  @Column({ name: "finished_at", type: "timestamptz", nullable: true })
  finishedAt: Date | null = null;

  @Column({
    type: "varchar",
    enum: ["RUNNING", "SUCCESS", "FAILED", "SKIPPED"],
  })
  status: string = "RUNNING";

  @Column({ name: "records_processed", type: "int", nullable: true })
  recordsProcessed: number | null = null;

  @Column({ name: "records_created", type: "int", nullable: true })
  recordsCreated: number | null = null;

  @Column({ name: "records_updated", type: "int", nullable: true })
  recordsUpdated: number | null = null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null = null;

  @Column({ type: "varchar", enum: ["CRON", "MANUAL"] })
  trigger: string = "CRON";
}
