import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";
import { DataSource } from "typeorm";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Clean up test data
    await dataSource.query("DELETE FROM users WHERE email LIKE '%test%'");
    await app.close();
  });

  describe("/auth/register (POST)", () => {
    it("should register a new user", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          email: `test_${Date.now()}@example.com`,
          password: "password123",
          name: "Test User",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toContain("test_");
        });
    });

    it("should reject duplicate email", async () => {
      const email = `duplicate_${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ email, password: "password123", name: "Test" });

      return request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ email, password: "password123", name: "Test" })
        .expect(401);
    });
  });

  describe("/auth/login (POST)", () => {
    let testEmail = `login_${Date.now()}@example.com`;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ email: testEmail, password: "password123", name: "Test" });
    });

    it("should login with valid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testEmail, password: "password123" })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });

    it("should reject invalid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testEmail, password: "wrongpassword" })
        .expect(401);
    });
  });
});
