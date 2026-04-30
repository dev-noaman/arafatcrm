import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMembershipTypeClassToOfficerndSync1779000000000 implements MigrationInterface {
    name = 'AddMembershipTypeClassToOfficerndSync1779000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "officernd_sync" ADD COLUMN "membership_type_class" character varying`);
        await queryRunner.query(`CREATE INDEX "idx_officernd_sync_type_class" ON "officernd_sync" ("membership_type_class")`);

        // Backfill — keyword rules mirror membership-type.classifier.ts.
        // Order matters: virtual → trade/license → coworking → office → others.
        await queryRunner.query(`
          UPDATE "officernd_sync"
          SET "membership_type_class" = CASE
            WHEN "membership_type" IS NULL OR trim("membership_type") = '' THEN 'OTHERS'
            WHEN lower("membership_type") LIKE '%virtual%' THEN 'VIRTUAL_OFFICE'
            WHEN lower("membership_type") ~ '\\mtl\\M' OR lower("membership_type") LIKE '%trade%' OR lower("membership_type") LIKE '%license%' THEN 'TRADE_LICENSE'
            WHEN lower("membership_type") LIKE '%flex%' OR lower("membership_type") LIKE '%cowork%' OR lower("membership_type") LIKE '%hot desk%' OR lower("membership_type") LIKE '%dedicated%' THEN 'COWORKING'
            WHEN lower("membership_type") LIKE '%office%' THEN 'OFFICE'
            ELSE 'OTHERS'
          END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_officernd_sync_type_class"`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" DROP COLUMN "membership_type_class"`);
    }
}
