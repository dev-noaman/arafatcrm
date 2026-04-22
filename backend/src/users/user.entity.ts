import { Exclude } from "class-transformer";
import { Column, Entity } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string = "";

  @Exclude()
  @Column()
  password: string = "";

  @Column({ type: "varchar", enum: ["ADMIN", "SALES"], default: "SALES" })
  role: string = "SALES";

  @Column({ nullable: true, type: "varchar" })
  name: string | null = null;

  @Column({ default: true })
  isActive: boolean = true;
}
