import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { User } from "../users/user.entity";
import { ClientSource } from "@arafat/shared";

@Entity("clients")
export class Client extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: "varchar", enum: ClientSource, default: ClientSource.REFERRAL })
  source: ClientSource;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User, (user) => [], { nullable: true })
  assignedTo: User;

  @OneToMany(() => "Deal", (deal: any) => deal.client)
  deals: any[];
}
