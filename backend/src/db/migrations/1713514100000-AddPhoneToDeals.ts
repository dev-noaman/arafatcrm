import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPhoneToDeals1713514100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "deals",
      new TableColumn({
        name: "phone",
        type: "varchar",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("deals", "phone");
  }
}
