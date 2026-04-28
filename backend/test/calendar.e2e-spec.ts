import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

describe("Calendar Module e2e Tests", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    dataSource = app.get(DataSource);

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const userRepo = dataSource.getRepository("User");
    const user = userRepo.create({
      email: `calendar_test_${Date.now()}@example.com`,
      password: hashedPassword,
      role: "ADMIN",
      name: "Calendar Test User",
    });
    await userRepo.save(user);
    userId = user.id;

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "password123" });
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM tidycal_tokens WHERE user_id = '${userId}'`);
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%calendar_test_%'`);
    await app.close();
  });

  describe("GET /calendar/connect", () => {
    it("should return TidyCal OAuth URL", () => {
      return request(app.getHttpServer())
        .get("/api/v1/calendar/connect")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.url).toBeDefined();
          expect(res.body.url).toContain("tidycal.com/oauth/authorize");
        });
    });

    it("should fail without authentication", () => {
      return request(app.getHttpServer())
        .get("/api/v1/calendar/connect")
        .expect(401);
    });
  });

  describe("GET /calendar/oauth/callback", () => {
    it("should redirect to error on forged state", () => {
      return request(app.getHttpServer())
        .get("/api/v1/calendar/oauth/callback")
        .query({ code: "fake", state: "forged" })
        .expect(302)
        .expect("Location", /calendar=error/);
    });

    it("should redirect to error on access_denied", () => {
      return request(app.getHttpServer())
        .get("/api/v1/calendar/oauth/callback")
        .query({ error: "access_denied" })
        .expect(302)
        .expect("Location", /calendar=error/);
    });
  });

  describe("GET /calendar/status", () => {
    it("should return not connected initially", () => {
      return request(app.getHttpServer())
        .get("/api/v1/calendar/status")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.connected).toBe(false);
        });
    });
  });

  describe("DELETE /calendar/connect", () => {
    it("should disconnect (idempotent)", () => {
      return request(app.getHttpServer())
        .delete("/api/v1/calendar/connect")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });
});
