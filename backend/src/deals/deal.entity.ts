import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { Client } from "../clients/client.entity";
import { Broker } from "../brokers/broker.entity";
import { User } from "../users/user.entity";
import { DealStatus, DealLocation, DealSpaceType, Currency, TERMINAL_STAGES } from "@arafat/shared";

@Entity("deals")
export class Deal extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  value: number;

  @Column({ type: "varchar", enum: DealStatus, default: DealStatus.ACTIVE })
  status: DealStatus;

  @Column({ type: "varchar", enum: DealLocation })
  location: DealLocation;

  @Column({ type: "varchar", enum: DealSpaceType })
  spaceType: DealSpaceType;

  @Column({ type: "varchar", enum: Currency, default: Currency.USD })
  currency: Currency;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  propertyAddress: string;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  commissionAmount: number;

  @Column({ type: "date", nullable: true })
  expectedCloseDate: Date;

  @Column({ type: "varchar", default: "lead" })
  stage: string;

  @Column({ type: "boolean", default: false })
  isLost: boolean;

  @Column({ type: "varchar", nullable: true })
  lossReason: string;

  @ManyToOne(() => Client, (client) => client.deals, { eager: true })
  client: Client;

  @ManyToOne(() => Broker, (broker) => broker.deals, { nullable: true, eager: true })
  broker: Broker | null;

  @ManyToOne(() => User, (user) => [])
  owner: User;

  @Column({ type: "varchar", array: true, default: "{}" })
  stageHistory: string[];
}
