import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

/**
 * Shared fixture used by Tasks 8, 9, and 10.
 *
 * Seed layout:
 *   Users:  admin, sales1, sales2  (all emails contain "officernd_reports_test_")
 *   Sync rows (8 total):
 *     - 2 PENDING  (no assignedTo, no dealId)
 *     - 2 ASSIGNED (sales1 × 1, sales2 × 1; no dealId)
 *     - 3 PIPELINED (sales1 × 2 with dealId, sales2 × 1 with dealId)
 *     - 1 IGNORED  (no assignedTo)
 *   Membership type distribution (set directly via membership_type column,
 *     classifier runs when the sync service writes the row but here we set
 *     membership_type_class directly via raw SQL UPDATE after insert):
 *     OFFICE×2, VIRTUAL_OFFICE×2, TRADE_LICENSE×1, COWORKING×2, OTHERS×1
 *   Deals (5 total):
 *     - 3 OfficeRnD-linked:
 *         sales1_won  (status=won,  stage=WON,  officerndSyncId=pipelined_sales1_a)
 *         sales1_lost (status=lost, stage=LOST, officerndSyncId=pipelined_sales1_b)
 *         sales2_active (status=active, stage=NEW, officerndSyncId=pipelined_sales2)
 *     - 2 organic (no officerndSyncId)
 *   One sync row (the IGNORED one) has created_at backdated 2 months for month-filter tests.
 */
describe("OfficerndReports endpoints", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let salesToken: string;
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

    // ── Users ────────────────────────────────────────────────────────────────
    const admin = userRepo.create({
      email: `officernd_reports_test_admin_${ts}@example.com`,
      password: hashedPassword,
      role: "ADMIN",
      name: `officernd_reports_test_admin_${ts}`,
    });
    const savedAdmin = await userRepo.save(admin);

    const sales1 = userRepo.create({
      email: `officernd_reports_test_sales1_${ts}@example.com`,
      password: hashedPassword,
      role: "SALES",
      name: `officernd_reports_test_sales1_${ts}`,
    });
    const savedSales1 = await userRepo.save(sales1);

    const sales2 = userRepo.create({
      email: `officernd_reports_test_sales2_${ts}@example.com`,
      password: hashedPassword,
      role: "SALES",
      name: `officernd_reports_test_sales2_${ts}`,
    });
    const savedSales2 = await userRepo.save(sales2);

    // ── Auth tokens ──────────────────────────────────────────────────────────
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "password123" });
    adminToken = adminLogin.body.accessToken;

    const salesLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: sales1.email, password: "password123" });
    salesToken = salesLogin.body.accessToken;

    // ── Clients (needed for deals) ───────────────────────────────────────────
    const clientRepo = dataSource.getRepository("Client");

    const client1 = clientRepo.create({
      name: `officernd_reports_test_client1_${ts}`,
      email: `officernd_reports_test_client1_${ts}@example.com`,
      source: "OFFICERND_RENEWAL",
    });
    const savedClient1 = await clientRepo.save(client1);

    const client2 = clientRepo.create({
      name: `officernd_reports_test_client2_${ts}`,
      email: `officernd_reports_test_client2_${ts}@example.com`,
      source: "OFFICERND_RENEWAL",
    });
    const savedClient2 = await clientRepo.save(client2);

    const client3 = clientRepo.create({
      name: `officernd_reports_test_client3_${ts}`,
      email: `officernd_reports_test_client3_${ts}@example.com`,
      source: "GOOGLE",
    });
    const savedClient3 = await clientRepo.save(client3);

    // ── OfficerndSync rows ───────────────────────────────────────────────────
    // Row 1: PENDING – membership_type_class = OFFICE
    const [pending1] = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'PENDING', NOW(), NOW())
       RETURNING id`,
      [
        `officernd_reports_test_company1_${ts}`,
        "Test Company 1",
        `officernd_reports_test_1_${ts}`,
        "Office Premium",
        "OFFICE",
        "2026-12-31",
      ],
    );

    // Row 2: PENDING – membership_type_class = OFFICE
    await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'PENDING', NOW(), NOW())`,
      [
        `officernd_reports_test_company2_${ts}`,
        "Test Company 2",
        `officernd_reports_test_2_${ts}`,
        "Office Standard",
        "OFFICE",
        "2026-12-31",
      ],
    );

    // Row 3: ASSIGNED to sales1 – membership_type_class = VIRTUAL_OFFICE
    await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'ASSIGNED', $7, NOW(), NOW())`,
      [
        `officernd_reports_test_company3_${ts}`,
        "Test Company 3",
        `officernd_reports_test_3_${ts}`,
        "Virtual Office Standard",
        "VIRTUAL_OFFICE",
        "2026-12-31",
        savedSales1.id,
      ],
    );

    // Row 4: ASSIGNED to sales2 – membership_type_class = VIRTUAL_OFFICE
    await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'ASSIGNED', $7, NOW(), NOW())`,
      [
        `officernd_reports_test_company4_${ts}`,
        "Test Company 4",
        `officernd_reports_test_4_${ts}`,
        "Virtual Office Premium",
        "VIRTUAL_OFFICE",
        "2026-12-31",
        savedSales2.id,
      ],
    );

    // Row 5: PIPELINED for sales1 (will back the won deal) – membership_type_class = TRADE_LICENSE
    const [pipeSales1a] = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'PIPELINED', $7, NOW(), NOW())
       RETURNING id`,
      [
        `officernd_reports_test_company5_${ts}`,
        "Test Company 5",
        `officernd_reports_test_5_${ts}`,
        "Trade License Renewal",
        "TRADE_LICENSE",
        "2026-12-31",
        savedSales1.id,
      ],
    );

    // Row 6: PIPELINED for sales1 (will back the lost deal) – membership_type_class = COWORKING
    const [pipeSales1b] = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'PIPELINED', $7, NOW(), NOW())
       RETURNING id`,
      [
        `officernd_reports_test_company6_${ts}`,
        "Test Company 6",
        `officernd_reports_test_6_${ts}`,
        "Flex 5-Day",
        "COWORKING",
        "2026-12-31",
        savedSales1.id,
      ],
    );

    // Row 7: PIPELINED for sales2 (will back the active deal) – membership_type_class = COWORKING
    const [pipeSales2] = await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'PIPELINED', $7, NOW(), NOW())
       RETURNING id`,
      [
        `officernd_reports_test_company7_${ts}`,
        "Test Company 7",
        `officernd_reports_test_7_${ts}`,
        "Coworking Pass",
        "COWORKING",
        "2026-12-31",
        savedSales2.id,
      ],
    );

    // Row 8: IGNORED – membership_type_class = OTHERS (backdated 2 months for month-filter tests)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoIso = twoMonthsAgo.toISOString();

    await dataSource.query(
      `INSERT INTO officernd_sync
         (officernd_company_id, company_name, membership_id, membership_type, membership_type_class,
          end_date, synced_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'IGNORED', $7, $7)`,
      [
        `officernd_reports_test_company8_${ts}`,
        "Test Company 8",
        `officernd_reports_test_8_${ts}`,
        "Misc plan",
        "OTHERS",
        "2026-12-31",
        twoMonthsAgoIso,
      ],
    );

    // ── Deals ────────────────────────────────────────────────────────────────
    const dealRepo = dataSource.getRepository("Deal");

    // OfficeRnD-linked: won (sales1)
    const wonDeal = dealRepo.create({
      title: `officernd_reports_test_won_${ts}`,
      value: 50000,
      location: "BARWA_ALSADD",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedClient1.id,
      ownerId: savedSales1.id,
      officerndSyncId: pipeSales1a.id,
      status: "won",
      stage: "WON",
    });
    const savedWonDeal = await dealRepo.save(wonDeal);

    // OfficeRnD-linked: lost (sales1)
    const lostDeal = dealRepo.create({
      title: `officernd_reports_test_lost_${ts}`,
      value: 40000,
      location: "BARWA_ALSADD",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedClient1.id,
      ownerId: savedSales1.id,
      officerndSyncId: pipeSales1b.id,
      status: "lost",
      stage: "LOST",
      isLost: true,
    });
    const savedLostDeal = await dealRepo.save(lostDeal);

    // OfficeRnD-linked: active (sales2)
    const activeDeal = dealRepo.create({
      title: `officernd_reports_test_active_${ts}`,
      value: 30000,
      location: "ELEMENT_WESTBAY",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedClient2.id,
      ownerId: savedSales2.id,
      officerndSyncId: pipeSales2.id,
      status: "active",
      stage: "NEW",
    });
    await dealRepo.save(activeDeal);

    // Update pipelined sync rows with their deal IDs
    await dataSource.query(
      `UPDATE officernd_sync SET deal_id = $1 WHERE id = $2`,
      [savedWonDeal.id, pipeSales1a.id],
    );
    await dataSource.query(
      `UPDATE officernd_sync SET deal_id = $1 WHERE id = $2`,
      [savedLostDeal.id, pipeSales1b.id],
    );
    await dataSource.query(
      `UPDATE officernd_sync SET deal_id = $1 WHERE id = $2`,
      [(await dealRepo.findOne({ where: { title: `officernd_reports_test_active_${ts}` } }))!.id, pipeSales2.id],
    );

    // Organic deal 1 (admin)
    const organicDeal1 = dealRepo.create({
      title: `officernd_reports_test_organic1_${ts}`,
      value: 60000,
      location: "BARWA_ALSADD",
      spaceType: "CLOSED_OFFICE",
      currency: "QAR",
      clientId: savedClient3.id,
      ownerId: savedAdmin.id,
      status: "active",
      stage: "NEW",
    });
    await dealRepo.save(organicDeal1);

    // Organic deal 2 (sales1)
    const organicDeal2 = dealRepo.create({
      title: `officernd_reports_test_organic2_${ts}`,
      value: 70000,
      location: "MARINA50_LUSAIL",
      spaceType: "ABC_FLEX",
      currency: "QAR",
      clientId: savedClient3.id,
      ownerId: savedSales1.id,
      status: "won",
      stage: "WON",
    });
    await dealRepo.save(organicDeal2);
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM deals WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%officernd_reports_test_%')`,
    );
    await dataSource.query(
      `DELETE FROM officernd_sync WHERE membership_id LIKE 'officernd_reports_test_%'`,
    );
    await dataSource.query(`DELETE FROM clients WHERE email LIKE '%officernd_reports_test_%'`);
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%officernd_reports_test_%'`);
    await app.close();
  });

  // ── Task 8 tests ───────────────────────────────────────────────────────────

  // Pre-test DB baseline counts (captured before our seed runs — but since
  // beforeAll already seeded, we use a different strategy: capture total row
  // counts from the DB directly and compare against what our rows contribute).

  describe("GET /dashboard/officernd/lifecycle-summary", () => {
    it("returns counts grouped by status with correct shape", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/dashboard/officernd/lifecycle-summary")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // Shape check: all four keys present
      expect(res.body).toMatchObject({
        pending: expect.any(Number),
        assigned: expect.any(Number),
        pipelined: expect.any(Number),
        ignored: expect.any(Number),
      });
      // Our seed added exactly 2 PENDING, 2 ASSIGNED, 3 PIPELINED, 1 IGNORED.
      // Verify DB directly to get the baseline so we can check our rows are counted.
      const [dbCounts] = await dataSource.query(
        `SELECT
           SUM(CASE WHEN status = 'PENDING'  THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) AS assigned,
           SUM(CASE WHEN status = 'PIPELINED' THEN 1 ELSE 0 END) AS pipelined,
           SUM(CASE WHEN status = 'IGNORED'  THEN 1 ELSE 0 END) AS ignored
         FROM officernd_sync`,
      );
      expect(res.body.pending).toBe(parseInt(dbCounts.pending, 10));
      expect(res.body.assigned).toBe(parseInt(dbCounts.assigned, 10));
      expect(res.body.pipelined).toBe(parseInt(dbCounts.pipelined, 10));
      expect(res.body.ignored).toBe(parseInt(dbCounts.ignored, 10));
      // Additionally verify our test rows are included (at least our seeded counts)
      expect(res.body.pending).toBeGreaterThanOrEqual(2);
      expect(res.body.assigned).toBeGreaterThanOrEqual(2);
      expect(res.body.pipelined).toBeGreaterThanOrEqual(3);
      expect(res.body.ignored).toBeGreaterThanOrEqual(1);
    });

    it("403s for SALES role", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/dashboard/officernd/lifecycle-summary")
        .set("Authorization", `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /reports/officernd/staff-summary", () => {
    it("returns per-staff assigned/pipelined/won/lost/winRate", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/reports/officernd/staff-summary")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // Find sales1 row by the unique-per-test-run username pattern
      const sales1 = res.body.find((r: any) => r.userName.includes("sales1"));
      expect(sales1).toBeDefined();
      expect(sales1.assigned).toBe(3);   // 1 ASSIGNED + 2 PIPELINED rows owned by sales1
      expect(sales1.pipelined).toBe(2);  // 2 PIPELINED rows
      expect(sales1.won).toBe(1);
      expect(sales1.lost).toBe(1);
      expect(sales1.winRate).toBe(50);
    });
    it("?month=YYYY-MM excludes rows outside the window", async () => {
      const oldMonth = "2024-01"; // before any seeded data
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/officernd/staff-summary?month=${oldMonth}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // None of the seeded sales1/sales2 rows should appear in 2024-01
      const sales1 = res.body.find((r: any) => r.userName.includes("sales1"));
      const sales2 = res.body.find((r: any) => r.userName.includes("sales2"));
      expect(sales1).toBeUndefined();
      expect(sales2).toBeUndefined();
    });
  });

  describe("GET /dashboard/officernd/by-type", () => {
    it("returns counts grouped by class, excluding IGNORED", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/dashboard/officernd/by-type")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const total = res.body.reduce((s: number, r: any) => s + r.count, 0);
      // Verify against DB: count all non-IGNORED rows
      const [dbCount] = await dataSource.query(
        `SELECT COUNT(*) AS cnt FROM officernd_sync WHERE status != 'IGNORED'`,
      );
      expect(total).toBe(parseInt(dbCount.cnt, 10));
      // Our seed contributed 7 non-IGNORED rows
      expect(total).toBeGreaterThanOrEqual(7);
    });
  });

  describe("GET /dashboard/officernd/assigned-by-staff", () => {
    it("returns counts of non-PENDING assigned rows", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/dashboard/officernd/assigned-by-staff")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const sales1Row = res.body.find((r: any) => r.userName.includes("sales1"));
      const sales2Row = res.body.find((r: any) => r.userName.includes("sales2"));
      // Our seeded sales1 has 3 non-PENDING rows (1 ASSIGNED + 2 PIPELINED)
      // Our seeded sales2 has 2 non-PENDING rows (1 ASSIGNED + 1 PIPELINED)
      expect(sales1Row.count).toBe(3);
      expect(sales2Row.count).toBe(2);
    });
  });

  describe("GET /dashboard/officernd/win-loss", () => {
    it("returns won/lost/active and winRate for OfficeRnD deals only", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/dashboard/officernd/win-loss")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // Verify against DB for exact global counts
      const [dbCounts] = await dataSource.query(
        `SELECT
           SUM(CASE WHEN status = 'won' OR stage = 'WON' THEN 1 ELSE 0 END) AS won,
           SUM(CASE WHEN status = 'lost' OR stage = 'LOST' THEN 1 ELSE 0 END) AS lost,
           SUM(CASE WHEN status = 'active' AND stage NOT IN ('WON','LOST') THEN 1 ELSE 0 END) AS active
         FROM deals
         WHERE officernd_sync_id IS NOT NULL`,
      );
      const dbWon = parseInt(dbCounts.won ?? "0", 10);
      const dbLost = parseInt(dbCounts.lost ?? "0", 10);
      const dbActive = parseInt(dbCounts.active ?? "0", 10);
      const expectedWinRate = dbWon + dbLost > 0
        ? Math.round((dbWon / (dbWon + dbLost)) * 1000) / 10
        : 0;
      expect(res.body.won).toBe(dbWon);
      expect(res.body.lost).toBe(dbLost);
      expect(res.body.active).toBe(dbActive);
      expect(res.body.winRate).toBe(expectedWinRate);
      // Our seed contributed 1 won, 1 lost, 1 active OfficeRnD deal
      expect(res.body.won).toBeGreaterThanOrEqual(1);
      expect(res.body.lost).toBeGreaterThanOrEqual(1);
      expect(res.body.active).toBeGreaterThanOrEqual(1);
    });
  });
});
