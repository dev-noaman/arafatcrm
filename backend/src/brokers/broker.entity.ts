import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { User } from "../users/user.entity";
import { Deal } from "../deals/deal.entity";

@Entity("brokers")
export class Broker extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  commissionRate: number;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User, (user) => [], { nullable: true })
  managedBy: User;

  @OneToMany(() => "Deal", (deal: any) => deal.broker)
  deals: any[];
}
