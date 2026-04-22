import { Column, Entity } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";

@Entity("data_sources")
export class DataSource extends BaseEntity {
  @Column({ unique: true })
  name!: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean = true;
}
