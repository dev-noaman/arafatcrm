import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { User } from "../users/user.entity";

@Entity("todos")
export class Todo extends BaseEntity {
  @Column()
  text!: string;

  @Column({ name: "is_completed", type: "boolean", default: false })
  isCompleted!: boolean;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;
}
