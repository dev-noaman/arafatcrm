import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveGoogleTokensAddTidyCalTokens1778000000000 implements MigrationInterface {
  name = "RemoveGoogleTokensAddTidyCalTokens1778000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "google_tokens"`);
    await queryRunner.query(
      `CREATE TABLE "tidycal_tokens" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"user_id" uuid NOT NULL, ` +
        `"access_token" text NOT NULL, ` +
        `"refresh_token" text NOT NULL, ` +
        `"token_expiry" TIMESTAMP NOT NULL, ` +
        `"booking_type_id" character varying(255), ` +
        `"username" character varying(255), ` +
        `"booking_type_slug" character varying(255), ` +
        `"created_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_tidycal_tokens" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "UQ_tidycal_tokens_user_id" UNIQUE ("user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tidycal_tokens" ADD CONSTRAINT "FK_tidycal_tokens_user_id" ` +
        `FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tidycal_tokens" DROP CONSTRAINT "FK_tidycal_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tidycal_tokens"`);
    await queryRunner.query(
      `CREATE TABLE "google_tokens" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"user_id" uuid NOT NULL, ` +
        `"access_token" text NOT NULL, ` +
        `"refresh_token" text NOT NULL, ` +
        `"token_expiry" TIMESTAMP NOT NULL, ` +
        `"scope" character varying, ` +
        `"created_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_google_tokens" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "google_tokens" ADD CONSTRAINT "FK_google_tokens_user_id" ` +
        `FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
