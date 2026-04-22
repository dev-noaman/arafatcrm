import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../common/entities/base.entity";
import { Broker } from "./broker.entity";

@Entity("broker_documents")
export class BrokerDocument extends BaseEntity {
  @Column({ name: "broker_id", type: "uuid" })
  brokerId!: string;

  @Column({ name: "doc_type", type: "varchar" })
  docType!: string;

  @Column()
  filename!: string;

  @Column({ name: "original_name" })
  originalName!: string;

  @Column()
  path!: string;

  @Column()
  mimetype!: string;

  @Column({ type: "bigint" })
  size!: number;

  @ManyToOne(() => Broker, (broker) => broker.documents, { onDelete: "CASCADE" })
  @JoinColumn({ name: "broker_id" })
  broker!: Broker;
}
