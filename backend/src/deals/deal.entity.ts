import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { Client } from "../clients/client.entity";
import { Broker } from "../brokers/broker.entity";
import { User } from "../users/user.entity";

@Entity("deals")
export class Deal extends BaseEntity {
  @Column()
  title!: string;

  @Column({ type: "decimal", precision: 15, scale: 2, transformer: { to: (v: any) => v, from: (v: any) => v !== null && v !== undefined ? Number(v) : v } })
  value!: number;

  @Column({ type: "varchar", enum: ["active", "won", "lost"], default: "active" })
  status!: string;

  @Column({ type: "varchar", enum: ["BARWA_ALSADD", "ELEMENT_WESTBAY", "MARINA50_LUSAIL"] })
  location!: string;

  @Column({ name: "space_type", type: "varchar", enum: ["CLOSED_OFFICE", "ABC_ADDRESS", "ABC_FLEX", "ABC_ELITE"] })
  spaceType!: string;

  @Column({ type: "varchar", enum: ["QAR"], default: "QAR" })
  currency!: string;

  @Column({ nullable: true, type: "text" })
  description: string | null = null;

  @Column({ name: "property_address", nullable: true, type: "varchar" })
  propertyAddress: string | null = null;

  @Column({ nullable: true, type: "varchar" })
  phone: string | null = null;

  @Column({ name: "commission_rate", type: "decimal", precision: 5, scale: 2, nullable: true, transformer: { to: (v: any) => v, from: (v: any) => v !== null && v !== undefined ? Number(v) : v } })
  commissionRate: number | null = null;

  @Column({ name: "commission_amount", type: "decimal", precision: 15, scale: 2, nullable: true, transformer: { to: (v: any) => v, from: (v: any) => v !== null && v !== undefined ? Number(v) : v } })
  commissionAmount: number | null = null;

  @Column({ name: "expected_close_date", type: "date", nullable: true })
  expectedCloseDate: Date | null = null;

  @Column({ type: "varchar", default: "lead" })
  stage!: string;

  @Column({ name: "is_lost", type: "boolean", default: false })
  isLost!: boolean;

  @Column({ name: "loss_reason", type: "varchar", nullable: true })
  lossReason: string | null = null;

  @Column({ name: "client_id", type: "uuid" })
  clientId!: string;

  @Column({ name: "broker_id", type: "uuid", nullable: true })
  brokerId: string | null = null;

  @Column({ name: "owner_id", type: "uuid" })
  ownerId!: string;

  @ManyToOne(() => Client, (client) => client.deals, { eager: true })
  @JoinColumn({ name: "client_id" })
  client!: Client;

  @ManyToOne(() => Broker, (broker) => broker.deals, { nullable: true, eager: true })
  @JoinColumn({ name: "broker_id" })
  broker!: Broker | null;

  @ManyToOne(() => User, (user) => [])
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Column({ name: "stage_history", type: "varchar", array: true, default: "{}" })
  stageHistory!: string[];
}
