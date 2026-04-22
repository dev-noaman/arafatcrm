import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { User } from "../users/user.entity";
import { Deal } from "../deals/deal.entity";
import { BrokerDocument } from "./broker-document.entity";

@Entity("brokers")
export class Broker extends BaseEntity {
  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  company!: string;

  @Column({ name: "broker_type", type: "varchar", default: "PERSONAL" })
  brokerType!: string;

  @Column({ name: "contract_from", type: "date", nullable: true })
  contractFrom: Date | null = null;

  @Column({ name: "contract_to", type: "date", nullable: true })
  contractTo: Date | null = null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  notes!: string;

  @Column({ name: "managed_by_id", nullable: true, type: "uuid" })
  managedById: string | null = null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "managed_by_id" })
  managedBy!: User | null;

  @OneToMany(() => Deal, (deal) => deal.broker)
  deals!: Deal[];

  @OneToMany(() => BrokerDocument, (doc) => doc.broker, { cascade: true })
  documents!: BrokerDocument[];
}
