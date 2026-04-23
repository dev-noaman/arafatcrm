import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

describe("OfficeRnD Module e2e Tests", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let salesToken: string;
  let adminEmail: string;
  let salesEmail: string;
  let salesUserId: string;

  // Sync row IDs created during tests
  let pendingSyncId: string;
  let assignedSyncId: string;
  let ignoredSyncId: string;
  let upstreamChangedSyncId: string;

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

    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const userRepo = dataSource.getRepository("User");

    // Create admin user
    adminEmail = `officernd_test_admin_${Date.now()}@example.com`;
    const admin = userRepo.create({
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      name: "Officernd Test Admin",
    });
    await userRepo.save(admin);

    // Create SALES user
    salesEmail = `officernd_test_sales_${Date.now()}@example.com`;
    const salesUser = userRepo.create({
      email: salesEmail,
      password: hashedPassword,
      role: "SALES",
      name: "Officernd Test Sales",
    });
    await userRepo.save(salesUser);
    salesUserId = salesUser.id;

    // Get auth tokens
    const adminLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: "password123" });
    adminToken = adminLogin.body.accessToken;

    const salesLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: salesEmail, password: "password123" });
    salesToken = salesLogin.body.accessToken;

    // Seed OfficerndSync rows directly via repository
    const syncRepo = dataSource.getRepository("OfficerndSync");

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    // PENDING row
    const pending = syncRepo.create({
      officerndCompanyId: "comp-pending-001",
      companyName: "Test Pending Company",
      contactEmail: "pending@test.com",
      contactPhone: "+974 5555 0001",
      membershipId: `mem-pending-${Date.now()}`,
      membershipType: "Private Office",
      membershipValue: 5000,
      endDate: futureDate,
      officerndData: { raw: "pending" },
      status: "PENDING",
      syncedAt: new Date(),
    });
    await syncRepo.save(pending);
    pendingSyncId = pending.id;

    // ASSIGNED row (needs assignedTo set to the admin user)
    const assigned = syncRepo.create({
      officerndCompanyId: "comp-assigned-001",
      companyName: "Test Assigned Company",
      contactEmail: "assigned@test.com",
      contactPhone: "+974 5555 0002",
      membershipId: `mem-assigned-${Date.now()}`,
      membershipType: "Dedicated Desk",
      membershipValue: 3000,
      endDate: futureDate,
      officerndData: { raw: "assigned" },
      status: "ASSIGNED",
      assignedTo: admin.id,
      syncedAt: new Date(),
    });
    await syncRepo.save(assigned);
    assignedSyncId = assigned.id;

    // IGNORED row
    const ignored = syncRepo.create({
      officerndCompanyId: "comp-ignored-001",
      companyName: "Test Ignored Company",
      contactEmail: "ignored@test.com",
      contactPhone: "+974 5555 0003",
      membershipId: `mem-ignored-${Date.now()}`,
      membershipType: "Hot Desk",
      membershipValue: 1500,
      endDate: futureDate,
      officerndData: { raw: "ignored" },
      status: "IGNORED",
      syncedAt: new Date(),
    });
    await syncRepo.save(ignored);
    ignoredSyncId = ignored.id;

    // Row with upstream changes (for acknowledge test)
    const upstreamChanged = syncRepo.create({
      officerndCompanyId: "comp-upstream-001",
      companyName: "Old Company Name",
      contactEmail: "upstream@test.com",
      contactPhone: "+974 5555 0004",
      membershipId: `mem-upstream-${Date.now()}`,
      membershipType: "Private Office",
      membershipValue: 5000,
      endDate: futureDate,
      officerndData: { raw: "upstream" },
      status: "ASSIGNED",
      assignedTo: admin.id,
      upstreamChanges: {
        companyName: { old: "Old Company Name", new: "New Company Name" },
      },
      upstreamChangedAt: new Date(),
      syncedAt: new Date(),
    });
    await syncRepo.save(upstreamChanged);
    upstreamChangedSyncId = upstreamChanged.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    await dataSource.query("DELETE FROM officernd_sync WHERE membership_id LIKE 'mem-pending-%' OR membership_id LIKE 'mem-assigned-%' OR membership_id LIKE 'mem-ignored-%' OR membership_id LIKE 'mem-upstream-%'");
    await dataSource.query("DELETE FROM deals WHERE title LIKE '%Renewal%'");
    await dataSource.query("DELETE FROM clients WHERE email LIKE '%officernd_test_%' OR email LIKE '%officernd.placeholder%'");
    await dataSource.query("DELETE FROM users WHERE email LIKE '%officernd_test_%'");
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 1. GET /officernd/sync-status
  // -----------------------------------------------------------------------
  describe("GET /officernd/sync-status", () => {
    it("should return counts object for authenticated admin", () => {
      return request(app.getHttpServer())
        .get("/api/v1/officernd/sync-status")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.counts).toBeDefined();
          expect(typeof res.body.counts).toBe("object");
          // We seeded PENDING, ASSIGNED (x2), IGNORED rows
          expect(res.body.counts.PENDING).toBeGreaterThanOrEqual(1);
          expect(res.body.counts.ASSIGNED).toBeGreaterThanOrEqual(2);
          expect(res.body.counts.IGNORED).toBeGreaterThanOrEqual(1);
        });
    });

    it("should return 401 without authentication", () => {
      return request(app.getHttpServer())
        .get("/api/v1/officernd/sync-status")
        .expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // 2. GET /officernd/expiring
  // -----------------------------------------------------------------------
  describe("GET /officernd/expiring", () => {
    it("should return paginated list for authenticated admin", () => {
      return request(app.getHttpServer())
        .get("/api/v1/officernd/expiring")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.total).toBeDefined();
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(20);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it("should filter by status", () => {
      return request(app.getHttpServer())
        .get("/api/v1/officernd/expiring")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ status: "PENDING" })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          res.body.data.forEach((row: any) => {
            expect(row.status).toBe("PENDING");
          });
        });
    });

    it("should return 403 for SALES role", () => {
      return request(app.getHttpServer())
        .get("/api/v1/officernd/expiring")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
    });

    it("should return 401 without authentication", () => {
      return request(app.getHttpServer())
        .get("/api/v1/officernd/expiring")
        .expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // 3. PATCH /officernd/:id/assign
  // -----------------------------------------------------------------------
  describe("PATCH /officernd/:id/assign", () => {
    it("should assign rep and change status to ASSIGNED", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/officernd/${pendingSyncId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: salesUserId })
        .expect(200)
        .expect((res) => {
          expect(res.body.assignedTo).toBe(salesUserId);
          expect(res.body.status).toBe("ASSIGNED");
        });
    });

    it("should return 404 for non-existent ID", () => {
      return request(app.getHttpServer())
        .patch("/api/v1/officernd/00000000-0000-0000-0000-000000000000/assign")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: salesUserId })
        .expect(404);
    });

    it("should return 400 for missing userId", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/officernd/${pendingSyncId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it("should return 401 without authentication", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/officernd/${pendingSyncId}/assign`)
        .send({ userId: salesUserId })
        .expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // 4. POST /officernd/:id/send-to-pipeline
  // -----------------------------------------------------------------------
  describe("POST /officernd/:id/send-to-pipeline", () => {
    it("should create deal + client and change status to PIPELINED", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/officernd/${assignedSyncId}/send-to-pipeline`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.sync).toBeDefined();
          expect(res.body.deal).toBeDefined();
          expect(res.body.sync.status).toBe("PIPELINED");
          expect(res.body.sync.clientId).toBeDefined();
          expect(res.body.sync.dealId).toBeDefined();
          expect(res.body.deal.title).toContain("Renewal");
          expect(res.body.deal.stage).toBe("NEW");
          expect(res.body.deal.status).toBe("active");
        });
    });

    it("should fail for PENDING row (must be ASSIGNED first)", () => {
      // pendingSyncId was assigned in the previous test, so create a fresh PENDING row
      return (async () => {
        const syncRepo = dataSource.getRepository("OfficerndSync");
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const freshPending = syncRepo.create({
          officerndCompanyId: "comp-fresh-pending",
          companyName: "Fresh Pending Company",
          contactEmail: `fresh-pending-${Date.now()}@test.com`,
          membershipId: `mem-fresh-${Date.now()}`,
          membershipValue: 2000,
          endDate: futureDate,
          status: "PENDING",
          syncedAt: new Date(),
        });
        await syncRepo.save(freshPending);

        const res = await request(app.getHttpServer())
          .post(`/api/v1/officernd/${freshPending.id}/send-to-pipeline`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(400);

        // Cleanup
        await syncRepo.delete(freshPending.id);
      })();
    });

    it("should return 404 for non-existent ID", () => {
      return request(app.getHttpServer())
        .post("/api/v1/officernd/00000000-0000-0000-0000-000000000000/send-to-pipeline")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // 5. PATCH /officernd/:id/ignore
  // -----------------------------------------------------------------------
  describe("PATCH /officernd/:id/ignore", () => {
    it("should set status to IGNORED", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/officernd/${pendingSyncId}/ignore`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("IGNORED");
        });
    });

    it("should return 404 for non-existent ID", () => {
      return request(app.getHttpServer())
        .patch("/api/v1/officernd/00000000-0000-0000-0000-000000000000/ignore")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // 6. PATCH /officernd/:id/unignore
  // -----------------------------------------------------------------------
  describe("PATCH /officernd/:id/unignore", () => {
    it("should reset status to PENDING", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/officernd/${ignoredSyncId}/unignore`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("PENDING");
        });
    });

    it("should return 404 for non-existent ID", () => {
      return request(app.getHttpServer())
        .patch("/api/v1/officernd/00000000-0000-0000-0000-000000000000/unignore")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // 7. PATCH /officernd/:id/acknowledge
  // -----------------------------------------------------------------------
  describe("PATCH /officernd/:id/acknowledge", () => {
    it("should clear upstream changes and apply new values", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/officernd/${upstreamChangedSyncId}/acknowledge`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.upstreamChanges).toBeNull();
          expect(res.body.upstreamChangedAt).toBeNull();
          // companyName should have been updated to the "new" value
          expect(res.body.companyName).toBe("New Company Name");
        });
    });

    it("should return 404 for non-existent ID", () => {
      return request(app.getHttpServer())
        .patch("/api/v1/officernd/00000000-0000-0000-0000-000000000000/acknowledge")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
