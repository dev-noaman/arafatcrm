import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateBrokersTable1713513800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "brokers",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "email",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "phone",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "company",
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
            name: "notes",
            type: "text",
            isNullable: true,
          },
          {
            name: "managed_by_id",
            type: "uuid",
            isNullable: true,
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
      "brokers",
      new TableForeignKey({
        name: "FK_brokers_managedBy",
        columnNames: ["managed_by_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("brokers");
    const foreignKey = table?.foreignKeys.find((fk) => fk.name === "FK_brokers_managedBy");
    if (foreignKey) {
      await queryRunner.dropForeignKey("brokers", foreignKey);
    }
    await queryRunner.dropTable("brokers");
  }
}
