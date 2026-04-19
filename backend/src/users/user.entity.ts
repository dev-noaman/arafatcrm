import { Column, Entity } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { Role } from "@arafat/shared";

@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: Role.USER })
  role: Role;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;
}
