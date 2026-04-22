import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { User } from "../users/user.entity";
import { Deal } from "../deals/deal.entity";

@Entity("clients")
export class Client extends BaseEntity {
  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, type: "varchar" })
  phone: string | null = null;

  @Column({ type: "varchar", enum: ["FACEBOOK", "INSTAGRAM", "TIKTOK", "BROKER", "GOOGLE"], default: "BROKER" })
  source: string = "BROKER";

  @Column({ nullable: true, type: "varchar" })
  company: string | null = null;

  @Column({ nullable: true, type: "text" })
  notes: string | null = null;

  @Column({ name: "assigned_to_id", nullable: true, type: "uuid" })
  assignedToId: string | null = null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "assigned_to_id" })
  assignedTo!: User | null;

  @OneToMany(() => Deal, (deal: Deal) => deal.client)
  deals!: Deal[];
}
