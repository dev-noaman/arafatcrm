import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

describe("Deals Module e2e Tests", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let clientId: string;
  let brokerId: string;
  let dealId: string;

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

    // Create admin user and get auth token
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("password123", 10);
    const userRepo = dataSource.getRepository("User");
    const admin = userRepo.create({
      email: `deals_test_admin_${Date.now()}@example.com`,
      password: hashedPassword,
      role: "ADMIN",
      name: "Deals Test Admin",
    });
    await userRepo.save(admin);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "password123" });
    authToken = loginRes.body.accessToken;

    // Create test client
    const clientRes = await request(app.getHttpServer())
      .post("/api/v1/clients")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Client",
        email: `test_client_${Date.now()}@example.com`,
        phone: "+974 5555 0000",
        source: "BROKER",
      });
    clientId = clientRes.body.id;

    // Create test broker
    const brokerRes = await request(app.getHttpServer())
      .post("/api/v1/brokers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Broker",
        email: `test_broker_${Date.now()}@example.com`,
        phone: "+974 5555 1111",
        company: "Test Brokerage",
        commissionRate: 2.5,
      });
    brokerId = brokerRes.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await dataSource.query("DELETE FROM deals WHERE 1=1");
    await dataSource.query("DELETE FROM brokers WHERE email LIKE '%deals_test_%' OR email LIKE '%test_broker_%'");
    await dataSource.query("DELETE FROM clients WHERE email LIKE '%deals_test_%' OR email LIKE '%test_client_%'");
    await dataSource.query("DELETE FROM users WHERE email LIKE '%deals_test_%'");
    await app.close();
  });

  describe("POST /deals - Create Deal", () => {
    it("should create a new deal successfully", () => {
      return request(app.getHttpServer())
        .post("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Deal Creation",
          value: 75000,
          location: "BARWA_ALSADD",
          spaceType: "WORKSTATION",
          currency: "QAR",
          clientId: clientId,
          brokerId: brokerId,
          expectedCloseDate: "2026-06-01",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe("Test Deal Creation");
          expect(res.body.value).toBe(75000);
          expect(res.body.stage).toBe("lead");
          expect(res.body.status).toBe("active");
          dealId = res.body.id;
        });
    });

    it("should fail without required fields", () => {
      return request(app.getHttpServer())
        .post("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          // Missing required fields: title, value, location, spaceType, clientId
        })
        .expect(400);
    });

    it("should fail without authentication", () => {
      return request(app.getHttpServer())
        .post("/api/v1/deals")
        .send({
          title: "Unauthorized Deal",
          value: 50000,
          location: "BARWA_ALSADD",
          spaceType: "WORKSTATION",
          clientId: clientId,
        })
        .expect(401);
    });
  });

  describe("GET /deals - List Deals", () => {
    it("should return paginated deals", () => {
      return request(app.getHttpServer())
        .get("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.total).toBeDefined();
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it("should filter by status", () => {
      return request(app.getHttpServer())
        .get("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10, status: "active" })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          res.body.data.forEach((deal: any) => {
            expect(deal.status).toBe("active");
          });
        });
    });

    it("should filter by stage", () => {
      return request(app.getHttpServer())
        .get("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10, stage: "lead" })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          res.body.data.forEach((deal: any) => {
            expect(deal.stage).toBe("lead");
          });
        });
    });
  });

  describe("GET /deals/:id - Get Deal by ID", () => {
    it("should return a single deal", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/deals/${dealId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(dealId);
          expect(res.body.title).toBe("Test Deal Creation");
          expect(res.body.client).toBeDefined();
          expect(res.body.broker).toBeDefined();
        });
    });

    it("should return 404 for non-existent deal", () => {
      return request(app.getHttpServer())
        .get("/api/v1/deals/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("PUT /deals/:id - Update Deal", () => {
    it("should update deal fields", () => {
      return request(app.getHttpServer())
        .put(`/api/v1/deals/${dealId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Deal Title",
          value: 85000,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe("Updated Deal Title");
          expect(res.body.value).toBe(85000);
        });
    });

    it("should update deal stage", () => {
      return request(app.getHttpServer())
        .put(`/api/v1/deals/${dealId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          stage: "QUALIFIED",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.stage).toBe("QUALIFIED");
        });
    });
  });

  describe("POST /deals/:id/mark-lost - Mark Deal as Lost", () => {
    let newDealId: string;

    beforeAll(async () => {
      // Create a new deal to mark as lost
      const res = await request(app.getHttpServer())
        .post("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Deal to Mark Lost",
          value: 60000,
          location: "ELEMENT_WESTBAY",
          spaceType: "OFFICE",
          currency: "QAR",
          clientId: clientId,
          brokerId: brokerId,
        });
      newDealId = res.body.id;
    });

    it("should mark deal as lost with reason", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/deals/${newDealId}/mark-lost`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reason: "Client chose competitor",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.isLost).toBe(true);
          expect(res.body.lossReason).toBe("Client chose competitor");
          expect(res.body.status).toBe("lost");
        });
    });

    it("should fail without reason", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/deals/${newDealId}/mark-lost`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("DELETE /deals/:id - Delete Deal", () => {
    let dealToDelete: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Deal to Delete",
          value: 40000,
          location: "MARINA50_LUSAIL",
          spaceType: "WORKSTATION",
          currency: "QAR",
          clientId: clientId,
        });
      dealToDelete = res.body.id;
    });

    it("should delete a deal", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/deals/${dealToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
    });

    it("should return 404 after deletion", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/deals/${dealToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("Deal Stage Transitions", () => {
    let transitionDealId: string;
    const stages = ["lead", "NEW", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "CONTRACT"];

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/deals")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Stage Transition Test",
          value: 100000,
          location: "BARWA_ALSADD",
          spaceType: "WORKSTATION",
          currency: "QAR",
          clientId: clientId,
        });
      transitionDealId = res.body.id;
    });

    it("should progress through all pipeline stages", async () => {
      for (const stage of stages) {
        const res = await request(app.getHttpServer())
          .put(`/api/v1/deals/${transitionDealId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({ stage });

        expect(res.status).toBe(200);
        expect(res.body.stage).toBe(stage);
      }
    });

    it("should update to won status", () => {
      return request(app.getHttpServer())
        .put(`/api/v1/deals/${transitionDealId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          stage: "WON",
          confirmTerminal: true,
        })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.stage).toBe("WON");
          expect(res.body.status).toBe("won");
        });
    });
  });
});
