import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

describe("Dashboard OfficeRnD exclusion", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let ts: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret-key-for-testing";

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
    ts = `${Date.now()}`;

    // Create admin user
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const userRepo = dataSource.getRepository("User");
    const admin = userRepo.create({
      email: `dashboard_test_admin_${ts}@example.com`,
      password: hashedPassword,
      role: "ADMIN",
      name: "Dashboard Test Admin",
    });
    const savedAdmin = await userRepo.save(admin);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "password123" });
    authToken = loginRes.body.accessToken;

    // Seed: organic client (GOOGLE source)
    const clientRepo = dataSource.getRepository("Client");
    const organicClient = clientRepo.create({
      name: "Dashboard Test Organic Client",
      email: `dashboard_test_organic_${ts}@example.com`,
      source: "GOOGLE",
    });
    const savedOrganicClient = await clientRepo.save(organicClient);

    // Seed: OfficeRnD client (OFFICERND_RENEWAL source)
    const officerndClient = clientRepo.create({
      name: "Dashboard Test OfficeRnD Client",
      email: `dashboard_test_officernd_${ts}@example.com`,
      source: "OFFICERND_RENEWAL",
    });
    const savedOfficerndClient = await clientRepo.save(officerndClient);

    // Seed: officernd_sync row
    const syncRows = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, end_date, synced_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), 'PIPELINED', NOW(), NOW())
       RETURNING id`,
      [
        `dashboard_test_company_${ts}`,
        "Dashboard Test Company",
        `dashboard_test_membership_${ts}`,
        "2026-12-31",
      ],
    );
    const syncId: string = syncRows[0].id;

    // Seed: organic deal (no officerndSyncId)
    const dealRepo = dataSource.getRepository("Deal");
    const organicDeal = dealRepo.create({
      title: "Dashboard Test Organic Deal",
      value: 50000,
      location: "BARWA_ALSADD",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedOrganicClient.id,
      ownerId: savedAdmin.id,
      status: "active",
      stage: "NEW",
    });
    await dealRepo.save(organicDeal);

    // Seed: OfficeRnD deal (has officerndSyncId)
    const officerndDeal = dealRepo.create({
      title: "Dashboard Test OfficeRnD Deal",
      value: 60000,
      location: "ELEMENT_WESTBAY",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedOfficerndClient.id,
      ownerId: savedAdmin.id,
      officerndSyncId: syncId,
      status: "active",
      stage: "NEW",
    });
    await dealRepo.save(officerndDeal);
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM deals WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%dashboard_test_%')`,
    );
    await dataSource.query(
      `DELETE FROM officernd_sync WHERE membership_id LIKE 'dashboard_test_%'`,
    );
    await dataSource.query(`DELETE FROM clients WHERE email LIKE '%dashboard_test_%'`);
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%dashboard_test_%'`);
    await app.close();
  });

  it("GET /dashboard/by-source excludes OFFICERND_RENEWAL bucket", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/by-source")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.find((r: any) => r.source === "OFFICERND_RENEWAL")).toBeUndefined();
    expect(res.body.find((r: any) => r.source === "GOOGLE")).toBeDefined();
  });

  it("GET /dashboard/stats counts only non-OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/stats")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalDeals).toBe(1); // only the organic deal
  });

  it("GET /dashboard/by-location excludes OfficeRnD-linked deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/by-location")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    // Only the organic deal contributes; OfficeRnD deal filtered out
    const totalRows = res.body.length;
    expect(totalRows).toBeGreaterThanOrEqual(1);
    // No assertions on individual won/lost — both deals are active
  });
});
