import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateClientsTable1713513700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "clients",
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
            name: "source",
            type: "varchar",
            default: "'referral'",
          },
          {
            name: "company",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "notes",
            type: "text",
            isNullable: true,
          },
          {
            name: "assigned_to_id",
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
      "clients",
      new TableForeignKey({
        name: "FK_clients_assignedTo",
        columnNames: ["assigned_to_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("clients");
    const foreignKey = table?.foreignKeys.find((fk) => fk.name === "FK_clients_assignedTo");
    if (foreignKey) {
      await queryRunner.dropForeignKey("clients", foreignKey);
    }
    await queryRunner.dropTable("clients");
  }
}
