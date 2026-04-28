import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("tidycal_tokens")
export class TidyCalToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text", name: "access_token" })
  accessToken!: string;

  @Column({ type: "text", name: "refresh_token" })
  refreshToken!: string;

  @Column({ type: "timestamp", name: "token_expiry" })
  tokenExpiry!: Date;

  @Column({ type: "varchar", nullable: true, name: "booking_type_id" })
  bookingTypeId: string | null = null;

  @Column({ type: "varchar", nullable: true, name: "username" })
  username: string | null = null;

  @Column({ type: "varchar", nullable: true, name: "booking_type_slug" })
  bookingTypeSlug: string | null = null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
