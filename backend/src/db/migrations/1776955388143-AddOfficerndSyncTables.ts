import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOfficerndSyncTables1776955388143 implements MigrationInterface {
    name = 'AddOfficerndSyncTables1776955388143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "todos" DROP CONSTRAINT "todos_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "broker_documents" DROP CONSTRAINT "broker_documents_broker_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "brokers" DROP CONSTRAINT "brokers_managed_by_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_deals_client"`);
        await queryRunner.query(`CREATE TABLE "officernd_sync" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "officernd_company_id" character varying NOT NULL, "company_name" character varying NOT NULL, "contact_email" character varying, "contact_phone" character varying, "membership_id" character varying NOT NULL, "membership_type" character varying, "membership_value" numeric(15,2), "end_date" date NOT NULL, "officernd_data" jsonb, "status" character varying NOT NULL DEFAULT 'PENDING', "assigned_to" uuid, "client_id" uuid, "deal_id" uuid, "upstream_changes" jsonb, "upstream_changed_at" TIMESTAMP WITH TIME ZONE, "synced_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_2099eb75ad7af92fc18f51b5b10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f27c9367d61021963b81348343" ON "officernd_sync" ("officernd_company_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8f2d11a069c700d7f34a03ad58" ON "officernd_sync" ("membership_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0e6559ef3640318f4e6dcbc9fd" ON "officernd_sync" ("end_date") `);
        await queryRunner.query(`CREATE TABLE "officernd_sync_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL, "records_processed" integer, "records_created" integer, "records_updated" integer, "error_message" text, "trigger" character varying NOT NULL, CONSTRAINT "PK_3421adaf4011771281329222750" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "officernd_sync_id" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "todos" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "todos" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "broker_documents" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "broker_documents" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "broker_documents" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "broker_documents" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "brokers" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "brokers" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "brokers" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "brokers" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "currency" SET DEFAULT 'QAR'`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "source" SET DEFAULT 'BROKER'`);
        await queryRunner.query(`ALTER TABLE "data_sources" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "data_sources" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "todos" ADD CONSTRAINT "FK_53511787e1f412d746c4bf223ff" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "broker_documents" ADD CONSTRAINT "FK_7e6cccde15e19d8ffccd974a1c0" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "brokers" ADD CONSTRAINT "FK_497d6d2a34113ef134f049f83f0" FOREIGN KEY ("managed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" ADD CONSTRAINT "FK_a55f5d2800afa1fba0f3d5cf0c9" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" ADD CONSTRAINT "FK_40fd17b8ca670fff03f53c75a15" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" ADD CONSTRAINT "FK_5184bbcd3697c2c357bfae9ad2d" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_7a1770366da1de36b1efc628073" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_91921018a1a0f62f8d26782af8a" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_39cb9fb7b130a5e5f7c5e290665" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_d2fc64cf17a41519dc9047e6876" FOREIGN KEY ("officernd_sync_id") REFERENCES "officernd_sync"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_8e6684d2f77233e2035025d35e0" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_f48a5f46db8d13a0c8dad0a435d" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_f48a5f46db8d13a0c8dad0a435d"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_8e6684d2f77233e2035025d35e0"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_d2fc64cf17a41519dc9047e6876"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_39cb9fb7b130a5e5f7c5e290665"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_91921018a1a0f62f8d26782af8a"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT "FK_7a1770366da1de36b1efc628073"`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" DROP CONSTRAINT "FK_5184bbcd3697c2c357bfae9ad2d"`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" DROP CONSTRAINT "FK_40fd17b8ca670fff03f53c75a15"`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" DROP CONSTRAINT "FK_a55f5d2800afa1fba0f3d5cf0c9"`);
        await queryRunner.query(`ALTER TABLE "brokers" DROP CONSTRAINT "FK_497d6d2a34113ef134f049f83f0"`);
        await queryRunner.query(`ALTER TABLE "broker_documents" DROP CONSTRAINT "FK_7e6cccde15e19d8ffccd974a1c0"`);
        await queryRunner.query(`ALTER TABLE "todos" DROP CONSTRAINT "FK_53511787e1f412d746c4bf223ff"`);
        await queryRunner.query(`ALTER TABLE "data_sources" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "data_sources" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "source" SET DEFAULT 'referral'`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "currency" SET DEFAULT 'USD'`);
        await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "brokers" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "brokers" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "brokers" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "brokers" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "broker_documents" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "broker_documents" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "broker_documents" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "broker_documents" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "todos" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "todos" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "officernd_sync_id"`);
        await queryRunner.query(`DROP TABLE "officernd_sync_runs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e6559ef3640318f4e6dcbc9fd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f2d11a069c700d7f34a03ad58"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f27c9367d61021963b81348343"`);
        await queryRunner.query(`DROP TABLE "officernd_sync"`);
        await queryRunner.query(`ALTER TABLE "deals" ADD CONSTRAINT "FK_deals_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "brokers" ADD CONSTRAINT "brokers_managed_by_id_fkey" FOREIGN KEY ("managed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "broker_documents" ADD CONSTRAINT "broker_documents_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
