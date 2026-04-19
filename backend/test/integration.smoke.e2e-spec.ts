import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";
import { DataSource } from "typeorm";

describe("Backend Integration Smoke Tests (e2e)", () => {
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
    // Cleanup test data
    await dataSource.query("DELETE FROM deals WHERE 1=1");
    await dataSource.query("DELETE FROM brokers WHERE 1=1");
    await dataSource.query("DELETE FROM clients WHERE 1=1");
    await dataSource.query("DELETE FROM users WHERE email LIKE '%smoke_%'");
    await app.close();
  });

  describe("Health Check", () => {
    it("/health (GET) - should return ok", () => {
      return request(app.getHttpServer()).get("/health").expect(200).expect("ok");
    });
  });

  describe("Auth Flow", () => {
    let accessToken: string;
    const testEmail = `smoke_user_${Date.now()}@example.com`;

    it("/auth/register (POST) - should register new user", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          email: testEmail,
          password: "password123",
          name: "Smoke Test User",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe(testEmail);
        });
    });

    it("/auth/login (POST) - should login with credentials", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: testEmail, password: "password123" })
        .expect(200)
        .expect((res) => {
          accessToken = res.body.accessToken;
          expect(res.body.accessToken).toBeDefined();
        });
    });
  });

  describe("CRUD Operations", () => {
    let authToken: string;
    let clientId: string;
    let brokerId: string;

    beforeAll(async () => {
      // Create admin user and get token
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userRepo = dataSource.getRepository("User");
      const admin = userRepo.create({
        email: `smoke_admin_${Date.now()}@example.com`,
        password: hashedPassword,
        role: "admin",
        name: "Smoke Admin",
      });
      await userRepo.save(admin);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: admin.email, password: "password123" });
      authToken = loginRes.body.accessToken;
    });

    // Client CRUD
    it("/clients (POST) - should create client", () => {
      return request(app.getHttpServer())
        .post("/api/v1/clients")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Smoke Test Client",
          email: `smoke_client_${Date.now()}@example.com`,
          phone: "+974 5555 0000",
          source: "REFERRAL",
        })
        .expect(201)
        .expect((res) => {
          clientId = res.body.id;
          expect(res.body.name).toBe("Smoke Test Client");
        });
    });

    it("/clients (GET) - should list clients", () => {
      return request(app.getHttpServer())
        .get("/api/v1/clients")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.total).toBeDefined();
        });
    });

    // Broker CRUD
    it("/brokers (POST) - should create broker", () => {
      return request(app.getHttpServer())
        .post("/api/v1/brokers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Smoke Test Broker",
          email: `smoke_broker_${Date.now()}@example.com`,
          phone: "+974 5555 1111",
          company: "Test Brokerage",
          commissionRate: 2.5,
        })
        .expect(201)
        .expect((res) => {
          brokerId = res.body.id;
          expect(res.body.name).toBe("Smoke Test Broker");
        });
    });

    // Deal CRUD
    it("/deals (POST) - should create deal", () => {
      return request(app.getHttpServer())
        .post("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Smoke Test Deal",
          value: 50000,
          location: "BARWA_ALSADD",
          spaceType: "WORKSTATION",
          currency: "QAR",
          clientId: clientId,
          brokerId: brokerId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe("Smoke Test Deal");
          expect(res.body.value).toBe(50000);
        });
    });

    // Dashboard
    it("/dashboard/stats (GET) - should return stats", () => {
      return request(app.getHttpServer())
        .get("/api/v1/dashboard/stats")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalClients).toBeDefined();
          expect(res.body.totalDeals).toBeDefined();
        });
    });

    // Reports
    it("/reports/pipeline (GET) - should return pipeline", () => {
      return request(app.getHttpServer())
        .get("/api/v1/reports/pipeline")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
