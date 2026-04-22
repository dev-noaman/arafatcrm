import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../../src/users/user.entity";

describe("Users (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testUserId: string;

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

    // Create admin user for testing
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminRepo = dataSource.getRepository(User);
    const admin = adminRepo.create({
      email: `admin_${Date.now()}@example.com`,
      password: hashedPassword,
      role: "admin",
      name: "Admin User",
    });
    await adminRepo.save(admin);

    // Login as admin to get token
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "admin123" });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.query("DELETE FROM users WHERE email LIKE '%admin_%'");
    await dataSource.query("DELETE FROM users WHERE email LIKE '%user_%'");
    await app.close();
  });

  describe("/users (POST)", () => {
    it("should create a new user (admin only)", () => {
      return request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: `user_${Date.now()}@example.com`,
          password: "password123",
          name: "Test User",
          role: "user",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.email).toContain("user_");
          testUserId = res.body.id;
        });
    });

    it("should reject non-admin access", () => {
      return request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", "Bearer invalidtoken")
        .send({ email: "test@example.com", password: "password123" })
        .expect(401);
    });
  });

  describe("/users (GET)", () => {
    it("should list all users (admin only)", () => {
      return request(app.getHttpServer())
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe("/users/:id (GET)", () => {
    it("should get a user by ID (admin only)", async () => {
      // Create a user first
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: `getuser_${Date.now()}@example.com`,
          password: "password123",
          name: "Get User",
        });

      const userId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toContain("getuser_");
        });
    });
  });

  describe("/users/:id (DELETE)", () => {
    it("should delete a user (admin only)", async () => {
      // Create a user first
      const createRes = await request(app.getHttpServer())
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: `deleteuser_${Date.now()}@example.com`,
          password: "password123",
          name: "Delete User",
        });

      const userId = createRes.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
