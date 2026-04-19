import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateDealsTable1713513900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "deals",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "title",
            type: "varchar",
          },
          {
            name: "value",
            type: "decimal",
            precision: 15,
            scale: 2,
          },
          {
            name: "status",
            type: "varchar",
            default: "'active'",
          },
          {
            name: "location",
            type: "varchar",
          },
          {
            name: "space_type",
            type: "varchar",
          },
          {
            name: "currency",
            type: "varchar",
            default: "'USD'",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "property_address",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "commission_rate",
            type: "decimal",
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: "commission_amount",
            type: "decimal",
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: "expected_close_date",
            type: "date",
            isNullable: true,
          },
          {
            name: "stage",
            type: "varchar",
            default: "'lead'",
          },
          {
            name: "is_lost",
            type: "boolean",
            default: false,
          },
          {
            name: "loss_reason",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "client_id",
            type: "uuid",
          },
          {
            name: "broker_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "owner_id",
            type: "uuid",
          },
          {
            name: "stage_history",
            type: "varchar",
            array: true,
            default: "'{}'",
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "deals",
      new TableForeignKey({
        name: "FK_deals_client",
        columnNames: ["client_id"],
        referencedTableName: "clients",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "deals",
      new TableForeignKey({
        name: "FK_deals_broker",
        columnNames: ["broker_id"],
        referencedTableName: "brokers",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.createForeignKey(
      "deals",
      new TableForeignKey({
        name: "FK_deals_owner",
        columnNames: ["owner_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    await queryRunner.dropForeignKey("deals", table?.foreignKeys.find((fk) => fk.name === "FK_deals_client")!);
    await queryRunner.dropForeignKey("deals", table?.foreignKeys.find((fk) => fk.name === "FK_deals_broker")!);
    await queryRunner.dropForeignKey("deals", table?.foreignKeys.find((fk) => fk.name === "FK_deals_owner")!);
    await queryRunner.dropTable("deals");
  }
}
