import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCreatedByToClients1745280000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "clients",
      new TableColumn({
        name: "created_by",
        type: "uuid",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("clients", "created_by");
  }
}
