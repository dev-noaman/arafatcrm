import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

describe("Reports source filter", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
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

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const userRepo = dataSource.getRepository("User");

    // Create admin user
    const admin = userRepo.create({
      email: `reports_test_admin_${ts}@example.com`,
      password: hashedPassword,
      role: "ADMIN",
      name: "Reports Test Admin",
    });
    const savedAdmin = await userRepo.save(admin);

    // Create sales user
    const sales = userRepo.create({
      email: `reports_test_sales_${ts}@example.com`,
      password: hashedPassword,
      role: "SALES",
      name: "Reports Test Sales",
    });
    const savedSales = await userRepo.save(sales);

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "password123" });
    adminToken = loginRes.body.accessToken;

    // Seed: GOOGLE organic client
    const clientRepo = dataSource.getRepository("Client");
    const organicClient = clientRepo.create({
      name: "Reports Test Organic Client",
      email: `reports_test_organic_${ts}@example.com`,
      source: "GOOGLE",
    });
    const savedOrganicClient = await clientRepo.save(organicClient);

    // Seed: OFFICERND_RENEWAL client
    const officerndClient = clientRepo.create({
      name: "Reports Test OfficeRnD Client",
      email: `reports_test_officernd_${ts}@example.com`,
      source: "OFFICERND_RENEWAL",
    });
    const savedOfficerndClient = await clientRepo.save(officerndClient);

    // Seed: 2 officernd_sync rows (one for admin deal, one for sales deal)
    const syncRows1 = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, end_date, synced_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), 'PIPELINED', NOW(), NOW())
       RETURNING id`,
      [
        `reports_test_company_admin_${ts}`,
        "Reports Test Company Admin",
        `reports_test_membership_admin_${ts}`,
        "2026-12-31",
      ],
    );
    const syncIdAdmin: string = syncRows1[0].id;

    const syncRows2 = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, end_date, synced_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), 'PIPELINED', NOW(), NOW())
       RETURNING id`,
      [
        `reports_test_company_sales_${ts}`,
        "Reports Test Company Sales",
        `reports_test_membership_sales_${ts}`,
        "2026-12-31",
      ],
    );
    const syncIdSales: string = syncRows2[0].id;

    const dealRepo = dataSource.getRepository("Deal");

    // Admin: organic won deal (no officerndSyncId)
    const adminOrganicDeal = dealRepo.create({
      title: "Reports Test Admin Organic Deal",
      value: 50000,
      location: "BARWA_ALSADD",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedOrganicClient.id,
      ownerId: savedAdmin.id,
      status: "won",
      stage: "WON",
    });
    await dealRepo.save(adminOrganicDeal);

    // Admin: OfficeRnD-linked lost deal
    const adminOfficerndDeal = dealRepo.create({
      title: "Reports Test Admin OfficeRnD Deal",
      value: 60000,
      location: "ELEMENT_WESTBAY",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedOfficerndClient.id,
      ownerId: savedAdmin.id,
      officerndSyncId: syncIdAdmin,
      status: "lost",
      stage: "LOST",
      isLost: true,
    });
    await dealRepo.save(adminOfficerndDeal);

    // Sales: organic won deal (no officerndSyncId)
    const salesOrganicDeal = dealRepo.create({
      title: "Reports Test Sales Organic Deal",
      value: 40000,
      location: "BARWA_ALSADD",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedOrganicClient.id,
      ownerId: savedSales.id,
      status: "won",
      stage: "WON",
    });
    await dealRepo.save(salesOrganicDeal);

    // Sales: OfficeRnD-linked lost deal
    const salesOfficerndDeal = dealRepo.create({
      title: "Reports Test Sales OfficeRnD Deal",
      value: 70000,
      location: "ELEMENT_WESTBAY",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedOfficerndClient.id,
      ownerId: savedSales.id,
      officerndSyncId: syncIdSales,
      status: "lost",
      stage: "LOST",
      isLost: true,
    });
    await dealRepo.save(salesOfficerndDeal);
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM deals WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%reports_test_%')`,
    );
    await dataSource.query(
      `DELETE FROM officernd_sync WHERE membership_id LIKE 'reports_test_%'`,
    );
    await dataSource.query(`DELETE FROM clients WHERE email LIKE '%reports_test_%'`);
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%reports_test_%'`);
    await app.close();
  });

  it("win-loss with no param returns all deals (back-compat)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/win-loss")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    expect(total).toBe(4); // 2 won + 2 lost across both users
  });

  it("win-loss?source=leads excludes OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/win-loss?source=leads")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    expect(total).toBe(2); // only the 2 won organic deals
  });

  it("win-loss?source=officernd returns only OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/win-loss?source=officernd")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    expect(total).toBe(2); // only the 2 lost OfficeRnD deals
  });

  it("staff-performance?source=leads excludes OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/staff-performance?source=leads")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.totalAssigned, 0);
    expect(total).toBe(2); // only organic deals
  });
});
