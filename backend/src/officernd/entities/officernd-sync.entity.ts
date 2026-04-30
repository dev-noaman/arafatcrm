import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "../../users/user.entity";
import { Client } from "../../clients/client.entity";
import { Deal } from "../../deals/deal.entity";

@Entity("officernd_sync")
export class OfficerndSync extends BaseEntity {
  @Index()
  @Column({ name: "officernd_company_id", type: "varchar" })
  officerndCompanyId: string = "";

  @Column({ name: "company_name", type: "varchar" })
  companyName: string = "";

  @Column({ name: "contact_email", type: "varchar", nullable: true })
  contactEmail: string | null = null;

  @Column({ name: "contact_phone", type: "varchar", nullable: true })
  contactPhone: string | null = null;

  @Index({ unique: true })
  @Column({ name: "membership_id", type: "varchar" })
  membershipId: string = "";

  @Column({ name: "membership_type", type: "varchar", nullable: true })
  membershipType: string | null = null;

  @Index()
  @Column({ name: "membership_type_class", type: "varchar", nullable: true })
  membershipTypeClass: string | null = null;

  @Column({
    name: "membership_value",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: any) => v,
      from: (v: any) => (v !== null && v !== undefined ? Number(v) : v),
    },
  })
  membershipValue: number | null = null;

  @Index()
  @Column({ name: "end_date", type: "date" })
  endDate: Date = new Date();

  @Column({ name: "officernd_data", type: "jsonb", nullable: true })
  officerndData: Record<string, any> | null = null;

  @Column({
    type: "varchar",
    enum: ["PENDING", "ASSIGNED", "PIPELINED", "IGNORED"],
    default: "PENDING",
  })
  status: string = "PENDING";

  @Column({ name: "assigned_to", type: "uuid", nullable: true })
  assignedTo: string | null = null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to" })
  assignedUser: User | null = null;

  @Column({ name: "client_id", type: "uuid", nullable: true })
  clientId: string | null = null;

  @ManyToOne(() => Client, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "client_id" })
  client: Client | null = null;

  @Column({ name: "deal_id", type: "uuid", nullable: true })
  dealId: string | null = null;

  @ManyToOne(() => Deal, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "deal_id" })
  deal: Deal | null = null;

  @Column({ name: "upstream_changes", type: "jsonb", nullable: true })
  upstreamChanges: Record<string, { old: any; new: any }> | null = null;

  @Column({ name: "upstream_changed_at", type: "timestamptz", nullable: true })
  upstreamChangedAt: Date | null = null;

  @Column({ name: "synced_at", type: "timestamptz" })
  syncedAt: Date = new Date();
}
