import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMeetingFieldsAndGoogleTokens1777221964772 implements MigrationInterface {
    name = 'AddMeetingFieldsAndGoogleTokens1777221964772'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "google_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "access_token" text NOT NULL, "refresh_token" text NOT NULL, "token_expiry" TIMESTAMP NOT NULL, "scope" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fd3fd334c893412fc1605e1feac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "meeting_date" date`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "meeting_time" TIME`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "meeting_duration" integer DEFAULT '30'`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "meeting_location" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "meeting_notes" text`);
        await queryRunner.query(`ALTER TABLE "deals" ADD "calendar_event_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "google_tokens" ADD CONSTRAINT "FK_7a54af4fdf32ebc6ae6b887e0b2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "google_tokens" DROP CONSTRAINT "FK_7a54af4fdf32ebc6ae6b887e0b2"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "calendar_event_id"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "meeting_notes"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "meeting_location"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "meeting_duration"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "meeting_time"`);
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "meeting_date"`);
        await queryRunner.query(`DROP TABLE "google_tokens"`);
    }

}
