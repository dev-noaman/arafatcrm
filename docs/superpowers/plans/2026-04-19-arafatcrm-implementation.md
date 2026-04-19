# ArafatCRM Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ArafatCRM — a production-ready NestJS + React CRM for Arafat Business Center — as specified in `docs/superpowers/specs/2026-04-19-arafatcrm-design.md`.

**Architecture:** pnpm-workspaces monorepo with `backend/` (NestJS + TypeORM + PostgreSQL), `frontend/` (React + Vite + Tailwind, TailAdmin Pro as base), and `packages/shared/` (enums + DTO types consumed by both apps). Delivery via `docker-compose up` with seeded demo data.

**Tech Stack:** NestJS · TypeORM · PostgreSQL 15 · JWT + bcrypt · class-validator · Swagger · React 18 · Vite · TailwindCSS · TailAdmin Pro · React Router v6 · TanStack Query · React Hook Form + Zod · @dnd-kit/core · Recharts · sonner · pnpm · Docker.

**Spec:** `docs/superpowers/specs/2026-04-19-arafatcrm-design.md`

---

## Prerequisites

Before Task 1, confirm on the local machine:

- Node 20+ (`node -v`)
- pnpm 9+ (`pnpm -v` — install via `npm i -g pnpm` if missing)
- Docker Desktop running (`docker ps`)
- `tailadmin-react-pro-222.zip` present at repo root (frontend base template)
- `prompt.md` present at repo root (original spec source, not modified by this plan)

---

## Phase 0 — Monorepo scaffolding and TailAdmin extraction

Goal: empty workspace → working `pnpm install`, git initialised, TailAdmin Pro extracted to a scratch directory we will cherry-pick from in Phase 9.

### Task 0.1: Initialize git and .gitignore

**Files:**
- Create: `.gitignore`
- Create: `.gitattributes`

- [ ] **Step 1:** From repo root, run `git init -b main`. Expected: `Initialized empty Git repository in D:/Copy/ArafatCrm/.git/`.

- [ ] **Step 2:** Create `.gitignore`:

```gitignore
# node
node_modules/
.pnp.*
.pnpm-store/

# build output
dist/
build/
.next/
.turbo/
.cache/

# env
.env
.env.local
.env.*.local
!.env.example

# ide
.idea/
.vscode/*
!.vscode/settings.json

# os
.DS_Store
Thumbs.db

# logs
*.log
npm-debug.log*
pnpm-debug.log*

# brainstorm
.superpowers/

# frontend template zip — tracked via extraction only
tailadmin-react-pro-222.zip
/tailadmin-source/

# coverage
coverage/
.nyc_output/
```

- [ ] **Step 3:** Create `.gitattributes`:

```
* text=auto eol=lf
*.sh text eol=lf
*.ps1 text eol=crlf
```

- [ ] **Step 4:** `git add -A && git status`. Expected: spec, prompt, gitignore, gitattributes staged; zip ignored.

- [ ] **Step 5:** Commit.

```bash
git commit -m "chore: initialize repo with .gitignore and existing spec"
```

### Task 0.2: Set up pnpm workspace root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`

- [ ] **Step 1:** Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "backend"
  - "frontend"
  - "packages/*"
```

- [ ] **Step 2:** Create root `package.json`:

```json
{
  "name": "arafat-crm",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "pnpm -r --parallel --filter ./backend --filter ./frontend run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "test": "pnpm --filter backend test",
    "test:e2e": "pnpm --filter backend test:e2e",
    "seed": "pnpm --filter backend seed",
    "migration:run": "pnpm --filter backend migration:run",
    "migration:generate": "pnpm --filter backend migration:generate"
  },
  "devDependencies": {
    "typescript": "5.5.4"
  }
}
```

- [ ] **Step 3:** Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- [ ] **Step 4:** Run `pnpm install`. Expected: workspace recognised, lockfile created.

- [ ] **Step 5:** Commit.

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: set up pnpm workspace root"
```

### Task 0.3: Extract TailAdmin Pro template

**Files:**
- Extract into: `tailadmin-source/` (ignored; source only)

- [ ] **Step 1:** Unzip `tailadmin-react-pro-222.zip` into `tailadmin-source/` at repo root. On Windows bash: `unzip tailadmin-react-pro-222.zip -d tailadmin-source/`. If `unzip` is missing, use PowerShell: `Expand-Archive tailadmin-react-pro-222.zip -DestinationPath tailadmin-source`.

- [ ] **Step 2:** `ls tailadmin-source/` — expected: a directory with `src/`, `package.json`, tailwind config. Note the exact sub-directory (often `tailadmin-react-pro-<version>/`).

- [ ] **Step 3:** Open `tailadmin-source/.../src/layout/` and `src/components/` and skim. These are the pieces Phase 9–10 will port. No commit — folder is gitignored.

### Task 0.4: Create `docs/superpowers/plans/` placeholder commit

**Files:**
- (this plan file is already written here)

- [ ] **Step 1:** `git add docs/superpowers/plans/2026-04-19-arafatcrm-implementation.md`
- [ ] **Step 2:** `git commit -m "docs: add implementation plan"`

---

## Phase 1 — Shared types package

Goal: `packages/shared` exports enums + DTO interfaces consumed by backend and frontend.

### Task 1.1: Scaffold `packages/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1:** `packages/shared/package.json`:

```json
{
  "name": "@arafat/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc --noEmit"
  }
}
```

- [ ] **Step 2:** `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3:** `packages/shared/src/index.ts`:

```ts
export * from "./enums";
export * from "./dto";
```

- [ ] **Step 4:** From repo root: `pnpm install`. Expected: `@arafat/shared` linked into workspace.

- [ ] **Step 5:** Commit:

```bash
git add packages/shared
git commit -m "feat(shared): scaffold shared types package"
```

### Task 1.2: Define enums

**Files:**
- Create: `packages/shared/src/enums.ts`

- [ ] **Step 1:** Write the file verbatim:

```ts
export const Role = {
  ADMIN: "ADMIN",
  SALES: "SALES",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ClientSource = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  BROKER: "BROKER",
  GOOGLE: "GOOGLE",
} as const;
export type ClientSource = (typeof ClientSource)[keyof typeof ClientSource];

export const DealStage = {
  NEW: "NEW",
  QUALIFIED: "QUALIFIED",
  MEETING: "MEETING",
  PROPOSAL: "PROPOSAL",
  NEGOTIATION: "NEGOTIATION",
  CONTRACT: "CONTRACT",
  WON: "WON",
  LOST: "LOST",
} as const;
export type DealStage = (typeof DealStage)[keyof typeof DealStage];

export const TERMINAL_STAGES: DealStage[] = [DealStage.WON, DealStage.LOST];

export const PIPELINE_STAGES: DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.MEETING,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.CONTRACT,
];

export const DealLocation = {
  BARWA_ALSADD: "BARWA_ALSADD",
  ELEMENT_WESTBAY: "ELEMENT_WESTBAY",
  MARINA50_LUSAIL: "MARINA50_LUSAIL",
} as const;
export type DealLocation = (typeof DealLocation)[keyof typeof DealLocation];

export const DealSpaceType = {
  WORKSTATION: "WORKSTATION",
  OFFICE: "OFFICE",
} as const;
export type DealSpaceType =
  (typeof DealSpaceType)[keyof typeof DealSpaceType];

export const Currency = { QAR: "QAR" } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];
```

- [ ] **Step 2:** `pnpm --filter @arafat/shared lint`. Expected: no errors.

- [ ] **Step 3:** Commit:

```bash
git add packages/shared/src/enums.ts
git commit -m "feat(shared): add domain enums"
```

### Task 1.3: Define DTO interfaces

**Files:**
- Create: `packages/shared/src/dto/index.ts`
- Create: `packages/shared/src/dto/common.ts`
- Create: `packages/shared/src/dto/user.ts`
- Create: `packages/shared/src/dto/client.ts`
- Create: `packages/shared/src/dto/broker.ts`
- Create: `packages/shared/src/dto/deal.ts`
- Create: `packages/shared/src/dto/dashboard.ts`
- Create: `packages/shared/src/dto/reports.ts`

- [ ] **Step 1:** `common.ts`:

```ts
export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, unknown>;
}
```

- [ ] **Step 2:** `user.ts`:

```ts
import { Role } from "../enums";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}
```

- [ ] **Step 3:** `client.ts`:

```ts
import { ClientSource } from "../enums";

export interface ClientDto {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  source: ClientSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  phone: string;
  email?: string | null;
  companyName?: string | null;
  source: ClientSource;
}

export type UpdateClientDto = Partial<CreateClientDto>;
```

- [ ] **Step 4:** `broker.ts`:

```ts
export interface BrokerDto {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  contractFrom: string;
  contractTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrokerDto {
  name: string;
  phone: string;
  company?: string | null;
  contractFrom: string;
  contractTo: string;
}

export type UpdateBrokerDto = Partial<CreateBrokerDto>;
```

- [ ] **Step 5:** `deal.ts`:

```ts
import {
  DealStage,
  DealLocation,
  DealSpaceType,
  Currency,
} from "../enums";
import { ClientDto } from "./client";
import { BrokerDto } from "./broker";
import { UserDto } from "./user";

export interface DealDto {
  id: string;
  client: ClientDto;
  broker: BrokerDto | null;
  paymentTerms: string | null;
  currency: Currency;
  expectedValue: string;
  expectedCloseDate: string;
  stage: DealStage;
  location: DealLocation;
  spaceType: DealSpaceType;
  createdBy: UserDto;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealDto {
  clientId: string;
  brokerId?: string | null;
  paymentTerms?: string | null;
  expectedValue: number;
  expectedCloseDate: string;
  stage?: DealStage;
  location: DealLocation;
  spaceType: DealSpaceType;
}

export type UpdateDealDto = Partial<
  Omit<CreateDealDto, "stage">
>;

export interface UpdateStageDto {
  stage: DealStage;
  confirmTerminal?: boolean;
}

export interface ReassignOwnerDto {
  userId: string;
}

export interface DealStageHistoryDto {
  id: string;
  dealId: string;
  fromStage: DealStage | null;
  toStage: DealStage;
  changedBy: UserDto;
  changedAt: string;
}
```

- [ ] **Step 6:** `dashboard.ts`:

```ts
export interface DashboardStatsDto {
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  revenueQar: string;
  conversionRate: number;
}
```

- [ ] **Step 7:** `reports.ts`:

```ts
import { DealLocation, ClientSource } from "../enums";

// Shape matches spec §6.4 exactly — do not add fields without updating the spec.
export interface WinLossReportDto {
  won: number;
  lost: number;
  revenueQar: string;   // sum of WON deals' expected_value, 2dp as string
}

// Shape per spec §6.4: "Bar-chart data."
export interface ByLocationReportDto {
  location: DealLocation;
  won: number;
  lost: number;
}

export interface BySourceReportDto {
  source: ClientSource;
  won: number;
  lost: number;
}

export interface RevenueTimeseriesPointDto {
  bucket: string;
  revenueQar: string;
  wonCount: number;
}
```

- [ ] **Step 8:** `dto/index.ts`:

```ts
export * from "./common";
export * from "./user";
export * from "./client";
export * from "./broker";
export * from "./deal";
export * from "./dashboard";
export * from "./reports";
```

- [ ] **Step 9:** `pnpm --filter @arafat/shared lint` → no errors.

- [ ] **Step 10:** Commit.

```bash
git add packages/shared/src/dto
git commit -m "feat(shared): add DTO interfaces for all entities"
```

---

## Phase 2 — Backend scaffolding, infra, Swagger, docker-compose (dev)

Goal: Empty Nest app boots, connects to dockerised Postgres, serves Swagger at `/api/docs`, and has the common infrastructure (exception filter, auth guards, pagination pipe) ready for feature modules in later phases.

### Task 2.1: Initialize Nest backend

**Commit cadence note:** this task's 13 steps span package setup, Nest skeleton, and bootstrap wiring. Commit after **Step 5** (manifests + configs land), after **Step 8** (skeleton compiles), and after **Step 11** (bootstrap boots). Three commits total — do not wait until the end.

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/src/app.controller.ts`
- Create: `backend/src/app.service.ts`

- [ ] **Step 1:** `backend/package.json`:

```json
{
  "name": "@arafat/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d ./data-source.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d ./data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d ./data-source.ts",
    "seed": "ts-node seed/seed.ts"
  },
  "dependencies": {
    "@arafat/shared": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/swagger": "^7.3.0",
    "@nestjs/typeorm": "^10.0.2",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "pg": "^8.11.5",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.20",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.30",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.8",
    "@typescript-eslint/eslint-plugin": "^7.3.1",
    "@typescript-eslint/parser": "^7.3.1",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typeorm-ts-node-commonjs": "^0.3.20",
    "typescript": "5.5.4"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2:** `backend/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": ".",
    "paths": { "@arafat/shared": ["../packages/shared/src"] }
  },
  "include": ["src/**/*", "test/**/*", "seed/**/*", "data-source.ts"]
}
```

- [ ] **Step 3:** `backend/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*.spec.ts"]
}
```

- [ ] **Step 4:** `backend/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

- [ ] **Step 5:** `backend/.env.example`:

```
NODE_ENV=development
BACKEND_PORT=3000
DATABASE_URL=postgres://arafat:arafat@localhost:5432/arafat_crm
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

- [ ] **Step 6:** `backend/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7:** `backend/src/app.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class AppController {
  @Get("health")
  health() {
    return { status: "ok" };
  }
}
```

- [ ] **Step 8:** `backend/src/app.service.ts`:

```ts
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {}
```

- [ ] **Step 9:** `backend/src/main.ts` (Swagger + global pipe + CORS):

```ts
import { NestFactory, Reflector } from "@nestjs/core";
import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle("ArafatCRM API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, doc);

  const port = Number(process.env.BACKEND_PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${port} (docs at /api/docs)`);
}
bootstrap();
```

- [ ] **Step 10:** From repo root: `pnpm install`. Expected: backend deps resolve.

- [ ] **Step 11:** Commit.

```bash
git add backend package.json pnpm-lock.yaml
git commit -m "feat(backend): scaffold NestJS app with Swagger + TypeORM wiring"
```

### Task 2.2: docker-compose.yml (postgres only for dev, full app later)

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example` (at repo root)

- [ ] **Step 1:** Root `.env.example`:

```
POSTGRES_USER=arafat
POSTGRES_PASSWORD=arafat
POSTGRES_DB=arafat_crm
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

BACKEND_PORT=3000
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 2:** `docker-compose.yml` (dev-focused; backend + frontend services added in Phase 18):

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-arafat}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-arafat}
      POSTGRES_DB: ${POSTGRES_DB:-arafat_crm}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-arafat}"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

- [ ] **Step 3:** `cp .env.example .env` and `cp backend/.env.example backend/.env`.

- [ ] **Step 4:** `docker compose up -d postgres && docker compose ps`. Expected: `postgres` healthy.

- [ ] **Step 5:** Commit:

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker-compose with postgres for development"
```

### Task 2.3: TypeORM DataSource for CLI + migrations folder

**Files:**
- Create: `backend/data-source.ts`
- Create: `backend/migrations/.gitkeep`

- [ ] **Step 1:** `backend/data-source.ts`:

```ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import * as path from "path";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, "src/**/*.entity.ts")],
  migrations: [path.join(__dirname, "migrations/*.ts")],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
});
```

- [ ] **Step 2:** Add `dotenv` to backend deps: `pnpm --filter @arafat/backend add dotenv`.

- [ ] **Step 3:** `touch backend/migrations/.gitkeep`.

- [ ] **Step 4:** `pnpm --filter @arafat/backend build`. Expected: compiles.

- [ ] **Step 5:** Smoke-start: `pnpm --filter @arafat/backend dev`. Hit `http://localhost:3000/api/v1/health` — expect `{status:"ok"}`. Hit `http://localhost:3000/api/docs` — expect Swagger UI. Stop with Ctrl+C.

- [ ] **Step 6:** Commit:

```bash
git add backend/data-source.ts backend/migrations backend/package.json pnpm-lock.yaml
git commit -m "feat(backend): add TypeORM datasource for migrations"
```

### Task 2.4: Common infrastructure — exception filter, pagination, decorators, guards

**Files:**
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Create: `backend/src/common/pipes/pagination.pipe.ts`
- Create: `backend/src/common/dto/pagination.dto.ts`
- Create: `backend/src/common/decorators/public.decorator.ts`
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Create: `backend/src/common/entities/base.entity.ts`
- Create: `backend/src/common/errors/error-codes.ts`

- [ ] **Step 1:** `error-codes.ts`:

```ts
export const ErrorCodes = {
  CLIENT_HAS_DEALS: "CLIENT_HAS_DEALS",
  BROKER_CONTRACT_EXPIRED: "BROKER_CONTRACT_EXPIRED",
  TERMINAL_CONFIRMATION_REQUIRED: "TERMINAL_CONFIRMATION_REQUIRED",
  TERMINAL_STAGE_LOCKED: "TERMINAL_STAGE_LOCKED",
  NOT_DEAL_OWNER: "NOT_DEAL_OWNER",
  CANNOT_DELETE_SELF: "CANNOT_DELETE_SELF",
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

- [ ] **Step 2:** `base.entity.ts`:

```ts
import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
```

- [ ] **Step 3:** `pagination.dto.ts`:

```ts
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;
}
```

- [ ] **Step 4:** `http-exception.filter.ts`:

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const normalized =
        typeof body === "string"
          ? { statusCode: status, message: body, error: exception.name }
          : {
              statusCode: status,
              message: (body as any).message ?? exception.message,
              error: (body as any).error ?? exception.name,
              details: (body as any).details,
            };
      return res.status(status).json(normalized);
    }

    this.logger.error(
      `Unhandled error on ${req.method} ${req.url}`,
      (exception as Error)?.stack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: "Internal server error",
      error: "InternalServerError",
    });
  }
}
```

- [ ] **Step 5:** Register the filter globally in `main.ts`. Edit `backend/src/main.ts` to add `app.useGlobalFilters(new HttpExceptionFilter())` right after `useGlobalPipes`.

- [ ] **Step 6:** `public.decorator.ts`:

```ts
import { SetMetadata } from "@nestjs/common";
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 7:** `roles.decorator.ts`:

```ts
import { SetMetadata } from "@nestjs/common";
import { Role } from "@arafat/shared";
export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 8:** `current-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "SALES";
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

- [ ] **Step 9:** `jwt-auth.guard.ts` (placeholder — real wiring in Task 3.2 when Passport JWT strategy is added):

```ts
import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 10:** `roles.guard.ts`:

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@arafat/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException("Unauthenticated");
    if (!required.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
```

- [ ] **Step 11:** `pnpm --filter @arafat/backend build`. Expected: compiles. (Some guards will be wired in Task 3.2; their imports already resolve.)

- [ ] **Step 12:** Commit:

```bash
git add backend/src/common backend/src/main.ts
git commit -m "feat(backend): add common infra (filter, guards, decorators, base entity)"
```

---

## Phase 3 — Auth + Users

Goal: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` work end-to-end; admin can manage users via `/users`. JWT guard protects everything except public routes. TDD throughout.

### Task 3.1: User entity + migration

**Files:**
- Create: `backend/src/users/entities/user.entity.ts`
- Create: `backend/src/users/users.module.ts`
- Create: `backend/migrations/<timestamp>-init-users.ts` (generated)

- [ ] **Step 1:** `user.entity.ts`:

```ts
import { Column, Entity, Index } from "typeorm";
import { Role } from "@arafat/shared";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("users")
export class UserEntity extends BaseEntity {
  @Column({ type: "text" })
  name!: string;

  @Index({ unique: true })
  @Column({ type: "citext" })
  email!: string;

  @Column({ name: "password_hash", type: "text" })
  passwordHash!: string;

  @Column({
    type: "enum",
    enum: ["ADMIN", "SALES"],
    default: "SALES",
  })
  role!: Role;
}
```

- [ ] **Step 2:** `users.module.ts` (scaffold — service/controller added in Task 3.4):

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
```

- [ ] **Step 3:** Register `UsersModule` in `AppModule` imports.

- [ ] **Step 4:** Create migration that adds `citext` extension + `user_role` enum + `users` table:

Create `backend/migrations/1713538800000-init-users.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitUsers1713538800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await q.query(`CREATE TYPE user_role AS ENUM ('ADMIN','SALES')`);
    await q.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email citext NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role user_role NOT NULL DEFAULT 'SALES',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE users`);
    await q.query(`DROP TYPE user_role`);
  }
}
```

- [ ] **Step 5:** Run: `pnpm --filter @arafat/backend migration:run`. Expected: migration applied; verify with `docker compose exec postgres psql -U arafat arafat_crm -c "\dt"`.

- [ ] **Step 6:** Commit:

```bash
git add backend/src/users backend/migrations backend/src/app.module.ts
git commit -m "feat(users): add User entity and initial migration"
```

### Task 3.2: Auth module — JWT strategy, register, login, me

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1:** Write `auth.service.spec.ts` first (TDD):

```ts
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { UserEntity } from "../users/entities/user.entity";

describe("AuthService", () => {
  let service: AuthService;
  let repo: jest.Mocked<Repository<UserEntity>>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    const mockJwt = { sign: jest.fn().mockReturnValue("tok") };
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    service = mod.get(AuthService);
    repo = mod.get(getRepositoryToken(UserEntity));
    jwt = mod.get(JwtService);
  });

  it("rejects duplicate email on register", async () => {
    repo.findOne.mockResolvedValue({ id: "u1" } as UserEntity);
    await expect(
      service.register({ name: "a", email: "a@b.com", password: "p" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("hashes password on register and signs JWT", async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((x) => x as UserEntity);
    repo.save.mockImplementation(async (x) => ({
      ...(x as UserEntity),
      id: "u1",
    }));
    const res = await service.register({
      name: "a",
      email: "a@b.com",
      password: "plain",
    });
    const saved = repo.save.mock.calls[0][0] as UserEntity;
    expect(saved.passwordHash).not.toBe("plain");
    expect(await bcrypt.compare("plain", saved.passwordHash)).toBe(true);
    expect(res.token).toBe("tok");
    expect(res.user.email).toBe("a@b.com");
  });

  it("throws Unauthorized on bad login", async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.login({ email: "x", password: "y" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("omits passwordHash from user in response", async () => {
    const hash = await bcrypt.hash("plain", 4);
    repo.findOne.mockResolvedValue({
      id: "u1",
      name: "a",
      email: "a@b.com",
      passwordHash: hash,
      role: "SALES",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserEntity);
    const res = await service.login({ email: "a@b.com", password: "plain" });
    expect((res.user as any).passwordHash).toBeUndefined();
  });
});
```

- [ ] **Step 2:** Run the test: `pnpm --filter @arafat/backend test auth.service`. Expected: FAIL (AuthService not implemented).

- [ ] **Step 3:** `register.dto.ts`:

```ts
import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2)
  name!: string;

  @ApiProperty() @IsEmail()
  email!: string;

  @ApiProperty() @IsString() @MinLength(8)
  password!: string;
}
```

- [ ] **Step 4:** `login.dto.ts`:

```ts
import { IsEmail, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() password!: string;
}
```

- [ ] **Step 5:** `auth.service.ts`:

```ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { UserEntity } from "../users/entities/user.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

function toUserDto(u: UserEntity) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private users: Repository<UserEntity>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: "SALES",
    });
    const saved = await this.users.save(created);
    return { user: toUserDto(saved), token: this.sign(saved) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return { user: toUserDto(user), token: this.sign(user) };
  }

  async me(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException();
    return toUserDto(user);
  }

  private sign(u: UserEntity) {
    return this.jwt.sign({ sub: u.id, role: u.role });
  }
}
```

- [ ] **Step 6:** `jwt.strategy.ts`:

```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../users/entities/user.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @InjectRepository(UserEntity) private users: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "change-me",
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, role: user.role };
  }
}
```

- [ ] **Step 7:** `auth.controller.ts`:

```ts
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
```

- [ ] **Step 8:** `auth.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { APP_GUARD } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "change-me",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 9:** Register `AuthModule` in `AppModule` imports.

- [ ] **Step 10:** Run unit tests: `pnpm --filter @arafat/backend test auth.service`. Expected: PASS (all 4 tests).

- [ ] **Step 11:** Smoke test via curl:
  - `pnpm --filter @arafat/backend dev` in one terminal.
  - `curl -s -X POST http://localhost:3000/api/v1/auth/register -H "content-type: application/json" -d '{"name":"A","email":"a@b.com","password":"password1"}'` → `{user, token}`.
  - `curl -s -X POST http://localhost:3000/api/v1/auth/login …` → same shape.
  - `curl -s http://localhost:3000/api/v1/auth/me -H "authorization: Bearer <token>"` → user.
  - `curl -s http://localhost:3000/api/v1/auth/me` (no token) → 401.

- [ ] **Step 12:** Commit:

```bash
git add backend/src/auth backend/src/app.module.ts
git commit -m "feat(auth): register, login, me with JWT + bcrypt"
```

### Task 3.3: E2E test scaffolding — isolated test Postgres

**Files:**
- Create: `backend/test/jest-e2e.json`
- Create: `backend/test/setup.ts`
- Create: `backend/test/test-db.ts`
- Create: `backend/test/auth.e2e-spec.ts`
- Create: `docker-compose.test.yml`
- Create: `backend/.env.test`

**Why a dedicated test DB:** spec §9.2 mandates a separate Postgres on a distinct port so the e2e suite's per-test `TRUNCATE` never touches dev data. Without this, running `pnpm test:e2e` and `pnpm dev` concurrently races and data vanishes mid-session.

- [ ] **Step 1a:** `docker-compose.test.yml`:

```yaml
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: arafat
      POSTGRES_PASSWORD: arafat
      POSTGRES_DB: arafat_crm_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data   # ephemeral — zero on restart
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arafat"]
      interval: 3s
      retries: 20
```

- [ ] **Step 1b:** `backend/.env.test`:

```
NODE_ENV=test
DATABASE_URL=postgres://arafat:arafat@localhost:5433/arafat_crm_test
JWT_SECRET=test-secret
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:5173
BACKEND_PORT=3001
```

- [ ] **Step 1c:** `test/setup.ts` — loads `.env.test` and runs migrations once per test run:

```ts
import "reflect-metadata";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.test" });

import { AppDataSource } from "../data-source";

beforeAll(async () => {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  await AppDataSource.runMigrations();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
});
```

- [ ] **Step 1d:** `test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^@arafat/shared$": "<rootDir>/../../packages/shared/src"
  },
  "setupFiles": ["<rootDir>/setup.ts"]
}
```

- [ ] **Step 1e:** Update `backend/package.json` `test:e2e` script so the test DB is ensured healthy first:

```json
"test:e2e": "docker compose -f ../docker-compose.test.yml up -d postgres-test && jest --config ./test/jest-e2e.json --runInBand"
```

- [ ] **Step 2:** `test/test-db.ts` — helper that truncates all app tables between tests:

```ts
import { DataSource } from "typeorm";

export async function truncateAll(ds: DataSource) {
  const tables = [
    "deal_stage_history",
    "deals",
    "brokers",
    "clients",
    "users",
  ];
  for (const t of tables) {
    await ds.query(`TRUNCATE TABLE ${t} CASCADE`).catch(() => undefined);
  }
}
```

- [ ] **Step 3:** `test/auth.e2e-spec.ts`:

```ts
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { truncateAll } from "./test-db";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    ds = app.get(DataSource);
  });

  beforeEach(() => truncateAll(ds));
  afterAll(() => app.close());

  it("registers, logs in, returns me", async () => {
    const reg = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "a@b.com", password: "password1" })
      .expect(201);
    expect(reg.body.token).toBeDefined();

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "a@b.com", password: "password1" })
      .expect(201);
    const token = login.body.token;

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(me.body.email).toBe("a@b.com");
  });

  it("rejects /me without token", () =>
    request(app.getHttpServer()).get("/api/v1/auth/me").expect(401));

  it("rejects duplicate email", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "a@b.com", password: "password1" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "a@b.com", password: "password1" })
      .expect(409);
  });
});
```

- [ ] **Step 4:** Run: `pnpm --filter @arafat/backend test:e2e`. Expected: 3 tests PASS.

- [ ] **Step 5:** Commit:

```bash
git add backend/test
git commit -m "test(auth): e2e coverage for register/login/me"
```

### Task 3.4: Users module (ADMIN CRUD)

**Files:**
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/users/users.controller.ts`
- Create: `backend/src/users/dto/create-user.dto.ts`
- Create: `backend/src/users/dto/update-user.dto.ts`
- Modify: `backend/src/users/users.module.ts`
- Create: `backend/src/users/users.service.spec.ts`

- [ ] **Step 1:** Write `users.service.spec.ts`. Paste the test bodies verbatim so no executor stubs a weak version:

```ts
import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { UsersService } from "./users.service";
import { UserEntity } from "./entities/user.entity";

describe("UsersService", () => {
  let svc: UsersService;
  const repo = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ ...x, id: x.id ?? "u-new", createdAt: new Date(), updatedAt: new Date() })),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(async () => []),
    delete: jest.fn(async () => ({ affected: 1 })),
    update: jest.fn(async () => ({ affected: 1 })),
    count: jest.fn(async () => 0),
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(UserEntity), useValue: repo }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it("create hashes the password with bcrypt cost≥10", async () => {
    repo.findOne.mockResolvedValue(null);
    await svc.create({ name: "A", email: "a@b.c", password: "Password@123", role: "SALES" });
    const saved = repo.save.mock.calls[0][0];
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$(1[0-9]|[2-9][0-9])\$/);
    expect(saved).not.toHaveProperty("password");
  });

  it("remove throws 409 CANNOT_DELETE_SELF when actor deletes their own id", async () => {
    repo.findOneBy.mockResolvedValue({ id: "u1", role: "ADMIN" });
    await expect(svc.remove("u1", { id: "u1", role: "ADMIN", email: "x" }))
      .rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ error: "CANNOT_DELETE_SELF" }),
      });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("remove succeeds when admin deletes a different user", async () => {
    repo.findOneBy.mockResolvedValue({ id: "other", role: "SALES" });
    await expect(svc.remove("other", { id: "admin", role: "ADMIN", email: "x" })).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith({ id: "other" });
  });

  it("update rejects role change by non-admin on self", async () => {
    repo.findOneBy.mockResolvedValue({ id: "u1", role: "SALES", name: "n", email: "x", passwordHash: "h", createdAt: new Date(), updatedAt: new Date() });
    await expect(svc.update("u1", { role: "ADMIN" }, { id: "u1", role: "SALES", email: "x" }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2:** Run test → fails. Implement `users.service.ts` to pass: `findAll` (paginated), `findOne`, `create` (admin), `update` (self or admin; role change requires admin), `remove` (admin; cannot delete self → throw `ConflictException` with `error: CANNOT_DELETE_SELF`).

- [ ] **Step 3:** DTOs:

```ts
// create-user.dto.ts
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@arafat/shared";

export class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsIn(["ADMIN", "SALES"]) role?: Role;
}
```

```ts
// update-user.dto.ts
import { PartialType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

- [ ] **Step 4:** `users.controller.ts` — `@Roles('ADMIN')` on list/create/delete; `PATCH /users/:id` allowed for ADMIN or self (check in service). All under `@ApiBearerAuth`.

- [ ] **Step 5:** Update `users.module.ts` to provide/export the service and register the controller.

- [ ] **Step 6:** Run unit tests → PASS.

- [ ] **Step 7:** Add `test/users.e2e-spec.ts` — smoke CRUD as ADMIN, verifies 403 for SALES, 409 on self-delete. Run → PASS.

- [ ] **Step 8:** Commit:

```bash
git add backend/src/users backend/test/users.e2e-spec.ts
git commit -m "feat(users): admin-scoped CRUD with self-delete guard"
```

---

## Phase 4 — Clients

Goal: full CRUD under `/api/v1/clients` with pagination, search, source filter, and 409 block on delete when deals reference the client.

### Task 4.1: Client entity + migration

**Files:**
- Create: `backend/src/clients/entities/client.entity.ts`
- Create: `backend/src/clients/clients.module.ts`
- Create: `backend/migrations/<ts>-init-clients.ts`

- [ ] **Step 1:** `client.entity.ts`:

```ts
import { Column, Entity, Index } from "typeorm";
import { ClientSource } from "@arafat/shared";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("clients")
export class ClientEntity extends BaseEntity {
  @Column({ type: "text" }) name!: string;
  @Column({ type: "text" }) phone!: string;
  @Column({ type: "text", nullable: true }) email!: string | null;

  @Column({ name: "company_name", type: "text", nullable: true })
  companyName!: string | null;

  @Index()
  @Column({
    type: "enum",
    enum: ["FACEBOOK", "INSTAGRAM", "TIKTOK", "BROKER", "GOOGLE"],
  })
  source!: ClientSource;
}
```

- [ ] **Step 2:** Migration creates `client_source` enum, `clients` table, index on `source`, and functional index `ON clients (lower(email))`.

```ts
import { MigrationInterface, QueryRunner } from "typeorm";
export class InitClients1713538900000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TYPE client_source AS ENUM ('FACEBOOK','INSTAGRAM','TIKTOK','BROKER','GOOGLE')`,
    );
    await q.query(`
      CREATE TABLE clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        phone text NOT NULL,
        email text,
        company_name text,
        source client_source NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX clients_source_idx ON clients(source)`);
    await q.query(
      `CREATE INDEX clients_email_lower_idx ON clients (lower(email))`,
    );
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE clients`);
    await q.query(`DROP TYPE client_source`);
  }
}
```

- [ ] **Step 3:** `clients.module.ts` scaffold (service + controller added in 4.2). Register in `AppModule`.

- [ ] **Step 4:** `pnpm migration:run` → verify.

- [ ] **Step 5:** Commit:

```bash
git add backend/src/clients backend/migrations
git commit -m "feat(clients): add Client entity and migration"
```

### Task 4.2: Clients service, controller, DTOs, tests

**Files:**
- Create: `backend/src/clients/clients.service.ts`
- Create: `backend/src/clients/clients.controller.ts`
- Create: `backend/src/clients/dto/create-client.dto.ts`
- Create: `backend/src/clients/dto/update-client.dto.ts`
- Create: `backend/src/clients/dto/list-clients-query.dto.ts`
- Create: `backend/src/clients/clients.service.spec.ts`

- [ ] **Step 1:** Write `clients.service.spec.ts`. Paste the test bodies verbatim — no prose-only tests:

```ts
import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { getRepositoryToken, getDataSourceToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ClientsService } from "./clients.service";
import { ClientEntity } from "./entities/client.entity";

function makeRepoMock() {
  return {
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
    findOne: jest.fn().mockResolvedValue({ id: "c1" }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ ...x, id: "c1" })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
}

describe("ClientsService", () => {
  let svc: ClientsService;
  const repo = makeRepoMock();
  const ds = { query: jest.fn() } as unknown as DataSource;

  beforeEach(async () => {
    jest.clearAllMocks();
    (ds.query as jest.Mock).mockReset();
    const mod = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(ClientEntity), useValue: repo },
        { provide: getDataSourceToken(), useValue: ds },
      ],
    }).compile();
    svc = mod.get(ClientsService);
  });

  it("remove throws 409 CLIENT_HAS_DEALS with details.dealsCount", async () => {
    (ds.query as jest.Mock)
      .mockResolvedValueOnce([{ has_table: true }])  // to_regclass probe
      .mockResolvedValueOnce([{ c: 3 }]);            // count query
    await expect(svc.remove("c1")).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        error: "CLIENT_HAS_DEALS",
        details: { dealsCount: 3 },
      }),
    });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("remove succeeds when there are zero referencing deals", async () => {
    (ds.query as jest.Mock)
      .mockResolvedValueOnce([{ has_table: true }])
      .mockResolvedValueOnce([{ c: 0 }]);
    await expect(svc.remove("c1")).resolves.toEqual({ ok: true });
    expect(repo.delete).toHaveBeenCalledWith({ id: "c1" });
  });

  it("remove treats missing deals table as zero (phase 4 before phase 6)", async () => {
    (ds.query as jest.Mock).mockResolvedValueOnce([{ has_table: false }]);
    await expect(svc.remove("c1")).resolves.toEqual({ ok: true });
  });

  it("findAll passes q as ILIKE across name/phone/email/company_name", async () => {
    const qb = (repo.createQueryBuilder as jest.Mock)();
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    qb.getManyAndCount.mockResolvedValue([[], 0]);
    await svc.findAll({ q: "ali", page: 1, limit: 20 } as any);
    // The `q` branch wraps 4 OR clauses inside a Brackets; we assert the
    // captured WHERE text includes each ILIKE target.
    const calls = qb.andWhere.mock.calls.map(String).join("|");
    expect(calls).toMatch(/name ILIKE/);
    expect(calls).toMatch(/phone ILIKE/);
    expect(calls).toMatch(/email ILIKE/);
    expect(calls).toMatch(/company_name ILIKE/);
  });

  it("findAll applies source filter when provided", async () => {
    const qb = (repo.createQueryBuilder as jest.Mock)();
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    qb.getManyAndCount.mockResolvedValue([[], 0]);
    await svc.findAll({ source: "FACEBOOK", page: 1, limit: 20 } as any);
    expect(qb.andWhere).toHaveBeenCalledWith("c.source = :s", { s: "FACEBOOK" });
  });

  it("findAll returns paginated envelope", async () => {
    const qb = (repo.createQueryBuilder as jest.Mock)();
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    qb.getManyAndCount.mockResolvedValue([[{ id: "c1" }], 7]);
    await expect(svc.findAll({ page: 2, limit: 3 } as any))
      .resolves.toEqual({ data: [{ id: "c1" }], page: 2, limit: 3, total: 7 });
    expect(qb.skip).toHaveBeenCalledWith(3);
    expect(qb.take).toHaveBeenCalledWith(3);
  });
});
```

- [ ] **Step 2:** Run test → fails.

- [ ] **Step 3:** DTOs:

```ts
// create-client.dto.ts
import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { ClientSource } from "@arafat/shared";

export class CreateClientDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() companyName?: string | null;
  @IsIn(["FACEBOOK","INSTAGRAM","TIKTOK","BROKER","GOOGLE"])
  source!: ClientSource;
}
```

```ts
// update-client.dto.ts
import { PartialType } from "@nestjs/swagger";
import { CreateClientDto } from "./create-client.dto";
export class UpdateClientDto extends PartialType(CreateClientDto) {}
```

```ts
// list-clients-query.dto.ts
import { IsIn, IsOptional, IsString } from "class-validator";
import { ClientSource } from "@arafat/shared";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListClientsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(["FACEBOOK","INSTAGRAM","TIKTOK","BROKER","GOOGLE"])
  source?: ClientSource;
}
```

- [ ] **Step 4:** `clients.service.ts` — query-builder style:

```ts
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Brackets, DataSource, Repository } from "typeorm";
import { ClientEntity } from "./entities/client.entity";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ListClientsQueryDto } from "./dto/list-clients-query.dto";
import { ErrorCodes } from "../common/errors/error-codes";

// NOTE: we deliberately do NOT import DealEntity here.
// Phase 4 lands before Phase 6, so `deal.entity.ts` does not exist yet.
// Importing it would either break compilation or create a circular
// Clients <-> Deals module graph. The "has deals?" probe uses a raw SQL
// count against the `deals` table, which is created by Phase 6's migration.
// Until that migration runs, the table is absent — we probe with
// `to_regclass('public.deals')` so Phase 4 passes without Phase 6.

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity) private clients: Repository<ClientEntity>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  private async countDealsForClient(clientId: string): Promise<number> {
    const [{ has_table }] = await this.ds.query(
      `SELECT to_regclass('public.deals') IS NOT NULL AS has_table`,
    );
    if (!has_table) return 0;
    const rows = await this.ds.query(
      `SELECT COUNT(*)::int AS c FROM deals WHERE client_id = $1`,
      [clientId],
    );
    return rows[0]?.c ?? 0;
  }

  async findAll(query: ListClientsQueryDto) {
    const qb = this.clients.createQueryBuilder("c").orderBy("c.created_at", "DESC");
    if (query.source) qb.andWhere("c.source = :s", { s: query.source });
    if (query.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where("c.name ILIKE :q", { q: `%${query.q}%` })
            .orWhere("c.phone ILIKE :q", { q: `%${query.q}%` })
            .orWhere("c.email ILIKE :q", { q: `%${query.q}%` })
            .orWhere("c.company_name ILIKE :q", { q: `%${query.q}%` });
        }),
      );
    }
    qb.skip((query.page - 1) * query.limit).take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, page: query.page, limit: query.limit, total };
  }

  async findOne(id: string) {
    const c = await this.clients.findOne({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  create(dto: CreateClientDto) {
    const c = this.clients.create(dto);
    return this.clients.save(c);
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    await this.clients.update({ id }, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const dealsCount = await this.countDealsForClient(id);
    if (dealsCount > 0) {
      throw new ConflictException({
        message: `Client has ${dealsCount} deal(s) and cannot be deleted`,
        error: ErrorCodes.CLIENT_HAS_DEALS,
        details: { dealsCount },
      });
    }
    await this.clients.delete({ id });
    return { ok: true };
  }
}
```

- [ ] **Step 5:** Controller — standard REST; all routes under `@ApiBearerAuth`. No role gates (shared reference data per spec §6.3).

- [ ] **Step 6:** Update `clients.module.ts` — register `TypeOrmModule.forFeature([ClientEntity])` only (no `DealEntity`; we probe via raw SQL to keep Phase 4 self-contained). Add the controller + service.

- [ ] **Step 7:** Run unit tests → PASS.

- [ ] **Step 8:** Add `test/clients.e2e-spec.ts` — happy-path CRUD only. **Defer the delete-with-deals 409 case to Task 6.5** (deals e2e). Reason: the `deals` table does not exist until Phase 6's migration runs, so an e2e that tries to insert a deal row in Phase 4 would fail. Leave a `it.todo("409 CLIENT_HAS_DEALS — covered in Task 6.5 after deals migration lands")` placeholder as a reminder.

- [ ] **Step 9:** Commit:

```bash
git add backend/src/clients backend/test/clients.e2e-spec.ts
git commit -m "feat(clients): CRUD with search, source filter; delete-with-deals deferred"
```

---

## Phase 5 — Brokers

Goal: full CRUD with `onlyActive` filter; `BrokerDto.isActive` computed on read; admin-only delete.

### Task 5.1: Broker entity + migration

**Files:**
- Create: `backend/src/brokers/entities/broker.entity.ts`
- Create: `backend/src/brokers/brokers.module.ts`
- Create: `backend/migrations/<ts>-init-brokers.ts`

- [ ] **Step 1:** `broker.entity.ts`:

```ts
import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("brokers")
export class BrokerEntity extends BaseEntity {
  @Column({ type: "text" }) name!: string;
  @Column({ type: "text" }) phone!: string;
  @Column({ type: "text", nullable: true }) company!: string | null;
  @Column({ name: "contract_from", type: "date" }) contractFrom!: string;
  @Column({ name: "contract_to", type: "date" }) contractTo!: string;
}
```

- [ ] **Step 2:** Migration: `brokers` table + check `contract_to >= contract_from`.

```ts
CREATE TABLE brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  company text,
  contract_from date NOT NULL,
  contract_to date NOT NULL,
  CHECK (contract_to >= contract_from),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
```

- [ ] **Step 3:** `brokers.module.ts` scaffold; register in `AppModule`.

- [ ] **Step 4:** Run migration, verify.

- [ ] **Step 5:** Commit.

### Task 5.2: Brokers service, controller, validity helper, tests

**Files:**
- Create: `backend/src/brokers/brokers.service.ts`
- Create: `backend/src/brokers/brokers.controller.ts`
- Create: `backend/src/brokers/dto/create-broker.dto.ts`
- Create: `backend/src/brokers/dto/update-broker.dto.ts`
- Create: `backend/src/brokers/dto/list-brokers-query.dto.ts`
- Create: `backend/src/brokers/broker-validity.ts`
- Create: `backend/src/brokers/brokers.service.spec.ts`

- [ ] **Step 1:** `broker-validity.ts` — pure helper with its own spec (see Step 5 for tests):

```ts
export function isBrokerActive(
  contractFrom: string,
  contractTo: string,
  now: Date = new Date(),
): boolean {
  const today = now.toISOString().slice(0, 10);
  return contractFrom <= today && today <= contractTo;
}
```

- [ ] **Step 2:** `brokers.service.spec.ts` tests:
  1. `findAll({ onlyActive: true })` excludes brokers with `contract_to < today`.
  2. `remove` deletes (no ownership rules beyond role gate on controller).
  3. `findOne` returns `isActive` flag.

- [ ] **Step 3:** Pure-function spec `broker-validity.spec.ts`:
  1. returns true when today ∈ [from, to]
  2. false when today > to
  3. false when today < from
  4. true on boundary days

- [ ] **Step 4:** Implement DTOs (parallel to clients) + service:

```ts
// brokers.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BrokerEntity } from "./entities/broker.entity";
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { ListBrokersQueryDto } from "./dto/list-brokers-query.dto";
import { isBrokerActive } from "./broker-validity";

@Injectable()
export class BrokersService {
  constructor(
    @InjectRepository(BrokerEntity) private brokers: Repository<BrokerEntity>,
  ) {}

  async findAll(q: ListBrokersQueryDto) {
    const qb = this.brokers.createQueryBuilder("b").orderBy("b.created_at", "DESC");
    if (q.onlyActive) {
      qb.andWhere("b.contract_from <= CURRENT_DATE")
        .andWhere("b.contract_to >= CURRENT_DATE");
    }
    if (q.q) qb.andWhere("(b.name ILIKE :s OR b.phone ILIKE :s OR b.company ILIKE :s)", { s: `%${q.q}%` });
    qb.skip((q.page - 1) * q.limit).take(q.limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map(this.withActive),
      page: q.page,
      limit: q.limit,
      total,
    };
  }

  async findOne(id: string) {
    const b = await this.brokers.findOne({ where: { id } });
    if (!b) throw new NotFoundException();
    return this.withActive(b);
  }

  create(dto: CreateBrokerDto) {
    return this.brokers.save(this.brokers.create(dto)).then(this.withActive);
  }
  async update(id: string, dto: UpdateBrokerDto) {
    await this.findOne(id);
    await this.brokers.update({ id }, dto);
    return this.findOne(id);
  }
  async remove(id: string) {
    await this.findOne(id);
    await this.brokers.delete({ id });
    return { ok: true };
  }

  private withActive = (b: BrokerEntity) => ({
    ...b,
    isActive: isBrokerActive(b.contractFrom, b.contractTo),
  });
}
```

- [ ] **Step 5:** Controller — standard REST; `@Roles('ADMIN')` on `DELETE`.

- [ ] **Step 6:** Run unit + validity specs → PASS.

- [ ] **Step 7:** Add `test/brokers.e2e-spec.ts`: CRUD, onlyActive filter, 403 when non-admin deletes.

- [ ] **Step 8:** Commit:

```bash
git add backend/src/brokers backend/test/brokers.e2e-spec.ts
git commit -m "feat(brokers): CRUD with active filter and admin-only delete"
```

---

## Phase 6 — Deals + stage history (the business-logic core)

Goal: CRUD, ownership enforcement, stage transitions (with transactional history writes), terminal-confirmation gate, reopen, broker-validity guard, admin-only owner reassignment.

### Task 6.1: Deal + DealStageHistory entities + migration

**Files:**
- Create: `backend/src/deals/entities/deal.entity.ts`
- Create: `backend/src/deals/entities/deal-stage-history.entity.ts`
- Create: `backend/src/deals/deals.module.ts`
- Create: `backend/migrations/<ts>-init-deals.ts`

- [ ] **Step 1:** `deal.entity.ts`:

```ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import {
  Currency,
  DealLocation,
  DealSpaceType,
  DealStage,
} from "@arafat/shared";
import { BaseEntity } from "../../common/entities/base.entity";
import { ClientEntity } from "../../clients/entities/client.entity";
import { BrokerEntity } from "../../brokers/entities/broker.entity";
import { UserEntity } from "../../users/entities/user.entity";

// Index names match spec §5.2 exactly: deals_stage_idx, deals_close_date_idx,
// deals_client_idx, deals_created_by_idx. The generated migration MUST carry
// these names — if TypeORM auto-generates something different, rename in the
// migration file before committing.
@Entity("deals")
@Index("deals_stage_idx", ["stage"])
@Index("deals_close_date_idx", ["expectedCloseDate"])
@Index("deals_client_idx", ["client"])
@Index("deals_created_by_idx", ["createdBy"])
export class DealEntity extends BaseEntity {
  @ManyToOne(() => ClientEntity, { nullable: false, eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "client_id" })
  client!: ClientEntity;

  @ManyToOne(() => BrokerEntity, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "broker_id" })
  broker!: BrokerEntity | null;

  @Column({ name: "payment_terms", type: "text", nullable: true })
  paymentTerms!: string | null;

  @Column({ type: "char", length: 3, default: "QAR" })
  currency!: Currency;

  @Column({ name: "expected_value", type: "numeric", precision: 12, scale: 2 })
  expectedValue!: string;

  @Column({ name: "expected_close_date", type: "date" })
  expectedCloseDate!: string;

  @Column({
    type: "enum",
    enum: ["NEW","QUALIFIED","MEETING","PROPOSAL","NEGOTIATION","CONTRACT","WON","LOST"],
    default: "NEW",
  })
  stage!: DealStage;

  @Column({
    type: "enum",
    enum: ["BARWA_ALSADD","ELEMENT_WESTBAY","MARINA50_LUSAIL"],
  })
  location!: DealLocation;

  @Column({
    name: "space_type",
    type: "enum",
    enum: ["WORKSTATION","OFFICE"],
  })
  spaceType!: DealSpaceType;

  @ManyToOne(() => UserEntity, { nullable: false, eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "created_by" })
  createdBy!: UserEntity;
}
```

- [ ] **Step 2:** `deal-stage-history.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DealStage } from "@arafat/shared";
import { DealEntity } from "./deal.entity";
import { UserEntity } from "../../users/entities/user.entity";

@Entity("deal_stage_history")
@Index("deal_stage_history_deal_idx", ["deal", "changedAt"])
export class DealStageHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => DealEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" })
  deal!: DealEntity;

  @Column({
    name: "from_stage",
    type: "enum",
    enum: ["NEW","QUALIFIED","MEETING","PROPOSAL","NEGOTIATION","CONTRACT","WON","LOST"],
    nullable: true,
  })
  fromStage!: DealStage | null;

  @Column({
    name: "to_stage",
    type: "enum",
    enum: ["NEW","QUALIFIED","MEETING","PROPOSAL","NEGOTIATION","CONTRACT","WON","LOST"],
  })
  toStage!: DealStage;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "changed_by" })
  changedBy!: UserEntity;

  @CreateDateColumn({ name: "changed_at", type: "timestamptz" })
  changedAt!: Date;
}
```

- [ ] **Step 3:** Migration — one file creates enums (`deal_stage`, `deal_location`, `deal_space_type`), `deals` table with all FKs + indexes + check on `expected_value`, and `deal_stage_history` with its index. Follow pattern from previous migrations; all FKs as specified in spec §5.2.

- [ ] **Step 4:** `deals.module.ts` scaffold; register in `AppModule`. Include `TypeOrmModule.forFeature([DealEntity, DealStageHistoryEntity])`.

- [ ] **Step 5:** Run migration; verify: `\d deals`, `\d deal_stage_history` show expected columns/indexes.

- [ ] **Step 6:** Commit:

```bash
git add backend/src/deals backend/migrations
git commit -m "feat(deals): add Deal + DealStageHistory entities and migration"
```

### Task 6.2: Stage-transition service (TDD-first, heart of the plan)

This service is the business-logic hotspot. Terminal confirmation, reopen, transactional history, ownership — everything converges here.

**Files:**
- Create: `backend/src/deals/deals.service.ts`
- Create: `backend/src/deals/deals.service.spec.ts`

- [ ] **Step 1:** Write spec first covering every rule. Paste as-is:

```ts
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { getDataSourceToken, getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { DealsService } from "./deals.service";
import { DealEntity } from "./entities/deal.entity";
import { DealStageHistoryEntity } from "./entities/deal-stage-history.entity";
import { BrokerEntity } from "../brokers/entities/broker.entity";
import { ClientEntity } from "../clients/entities/client.entity";
import { ErrorCodes } from "../common/errors/error-codes";

function mockRepo(): any {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe("DealsService — stage transitions & rules", () => {
  let service: DealsService;
  const deals = mockRepo();
  const history = mockRepo();
  const brokers = mockRepo();
  const clients = mockRepo();
  const ds: any = {
    transaction: jest.fn((cb: any) =>
      cb({
        getRepository: (t: any) =>
          t === DealEntity ? deals : t === DealStageHistoryEntity ? history : null,
      }),
    ),
  };

  beforeEach(async () => {
    Object.values({ deals, history, brokers, clients }).forEach((r) =>
      Object.values(r).forEach((fn: any) => fn.mockReset?.()),
    );
    const mod = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: getRepositoryToken(DealEntity), useValue: deals },
        { provide: getRepositoryToken(DealStageHistoryEntity), useValue: history },
        { provide: getRepositoryToken(BrokerEntity), useValue: brokers },
        { provide: getRepositoryToken(ClientEntity), useValue: clients },
        { provide: getDataSourceToken(), useValue: ds },
      ],
    }).compile();
    service = mod.get(DealsService);
  });

  const admin = { id: "admin", role: "ADMIN" as const, email: "a@a" };
  const sales = { id: "sales1", role: "SALES" as const, email: "s@a" };

  it("requires confirmTerminal when moving to WON", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "NEGOTIATION",
      createdBy: { id: sales.id },
    });
    await expect(
      service.updateStage("d1", { stage: "WON" as any }, sales),
    ).rejects.toMatchObject({ response: { error: ErrorCodes.TERMINAL_CONFIRMATION_REQUIRED } });
  });

  it("accepts WON when confirmTerminal=true and writes history", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "NEGOTIATION",
      createdBy: { id: sales.id },
    });
    deals.save.mockImplementation(async (x: any) => x);
    await service.updateStage(
      "d1",
      { stage: "WON" as any, confirmTerminal: true },
      sales,
    );
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({ fromStage: "NEGOTIATION", toStage: "WON" }),
    );
  });

  it("blocks PATCH out of WON — must use reopen", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "WON",
      createdBy: { id: sales.id },
    });
    await expect(
      service.updateStage(
        "d1",
        { stage: "NEGOTIATION" as any, confirmTerminal: true },
        sales,
      ),
    ).rejects.toMatchObject({ response: { error: ErrorCodes.TERMINAL_STAGE_LOCKED } });
  });

  it("reopen moves WON → NEGOTIATION and logs history", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "WON",
      createdBy: { id: sales.id },
    });
    await service.reopen("d1", sales);
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({ fromStage: "WON", toStage: "NEGOTIATION" }),
    );
  });

  it("reopen throws ConflictException when deal not terminal", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "NEGOTIATION",
      createdBy: { id: sales.id },
    });
    await expect(service.reopen("d1", sales)).rejects.toBeInstanceOf(ConflictException);
  });

  it("SALES non-owner cannot mutate stage — throws Forbidden (NOT_DEAL_OWNER)", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "NEGOTIATION",
      createdBy: { id: "other" },
    });
    await expect(
      service.updateStage("d1", { stage: "MEETING" as any }, sales),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("ADMIN can mutate any deal", async () => {
    deals.findOne.mockResolvedValue({
      id: "d1",
      stage: "NEGOTIATION",
      createdBy: { id: "other" },
    });
    deals.save.mockImplementation(async (x: any) => x);
    await expect(
      service.updateStage("d1", { stage: "MEETING" as any }, admin),
    ).resolves.toBeDefined();
  });

  it("rejects expired broker on create", async () => {
    clients.findOneBy.mockResolvedValue({ id: "c1" });
    brokers.findOneBy.mockResolvedValue({
      id: "b1",
      contractFrom: "2000-01-01",
      contractTo: "2000-12-31",
    });
    await expect(
      service.create(
        {
          clientId: "c1",
          brokerId: "b1",
          expectedValue: 100,
          expectedCloseDate: "2030-01-01",
          location: "BARWA_ALSADD" as any,
          spaceType: "OFFICE" as any,
        },
        sales,
      ),
    ).rejects.toMatchObject({ response: { error: ErrorCodes.BROKER_CONTRACT_EXPIRED } });
  });

  it("writes initial history row on create", async () => {
    clients.findOneBy.mockResolvedValue({ id: "c1" });
    deals.save.mockImplementation(async (x: any) => ({ ...x, id: "d1" }));
    await service.create(
      {
        clientId: "c1",
        expectedValue: 100,
        expectedCloseDate: "2030-01-01",
        location: "BARWA_ALSADD" as any,
        spaceType: "OFFICE" as any,
      },
      sales,
    );
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({ fromStage: null, toStage: "NEW" }),
    );
  });
});
```

- [ ] **Step 2:** Run: `pnpm --filter @arafat/backend test deals.service`. Expected: FAIL (DealsService not implemented).

- [ ] **Step 3:** Implement `deals.service.ts`:

```ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Brackets, DataSource, Repository } from "typeorm";
import {
  DealStage,
  TERMINAL_STAGES,
} from "@arafat/shared";
import { DealEntity } from "./entities/deal.entity";
import { DealStageHistoryEntity } from "./entities/deal-stage-history.entity";
import { BrokerEntity } from "../brokers/entities/broker.entity";
import { ClientEntity } from "../clients/entities/client.entity";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { ErrorCodes } from "../common/errors/error-codes";
import { isBrokerActive } from "../brokers/broker-validity";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { ListDealsQueryDto } from "./dto/list-deals-query.dto";

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealEntity) private deals: Repository<DealEntity>,
    @InjectRepository(DealStageHistoryEntity)
    private history: Repository<DealStageHistoryEntity>,
    @InjectRepository(BrokerEntity) private brokers: Repository<BrokerEntity>,
    @InjectRepository(ClientEntity) private clients: Repository<ClientEntity>,
    @InjectDataSource() private ds: DataSource,
  ) {}

  async findAll(q: ListDealsQueryDto, user: AuthUser) {
    const qb = this.deals
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.client", "client")
      .leftJoinAndSelect("d.broker", "broker")
      .leftJoinAndSelect("d.createdBy", "createdBy")
      .orderBy("d.updated_at", "DESC");

    if (user.role !== "ADMIN") qb.andWhere("d.created_by = :uid", { uid: user.id });
    if (q.stage) qb.andWhere("d.stage = :s", { s: q.stage });
    if (q.location) qb.andWhere("d.location = :loc", { loc: q.location });
    if (q.brokerId) qb.andWhere("d.broker_id = :bid", { bid: q.brokerId });
    if (q.source) qb.andWhere("client.source = :src", { src: q.source });
    if (q.from) qb.andWhere("d.expected_close_date >= :from", { from: q.from });
    if (q.to) qb.andWhere("d.expected_close_date <= :to", { to: q.to });
    if (q.q)
      qb.andWhere(
        new Brackets((b) => {
          b.where("client.name ILIKE :text", { text: `%${q.q}%` })
            .orWhere("client.company_name ILIKE :text", { text: `%${q.q}%` });
        }),
      );
    qb.skip((q.page - 1) * q.limit).take(q.limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, page: q.page, limit: q.limit, total };
  }

  async findOne(id: string, user: AuthUser) {
    const d = await this.deals.findOne({
      where: { id },
      relations: ["client", "broker", "createdBy"],
    });
    if (!d) throw new NotFoundException();
    this.assertVisible(d, user);   // non-owner SALES -> silent 404 on read
    return d;
  }

  /**
   * Used by mutation paths (update / remove / updateStage / reopen).
   * Returns the row regardless of ownership, so the caller can throw an
   * explicit 403 NOT_DEAL_OWNER when a non-owner SALES attempts to mutate.
   * If the row truly doesn't exist → 404.
   */
  private async loadForMutation(id: string) {
    const d = await this.deals.findOne({
      where: { id },
      relations: ["client", "broker", "createdBy"],
    });
    if (!d) throw new NotFoundException();
    return d;
  }

  async create(dto: CreateDealDto, user: AuthUser) {
    const client = await this.clients.findOneBy({ id: dto.clientId });
    if (!client) throw new NotFoundException("Client not found");
    let broker: BrokerEntity | null = null;
    if (dto.brokerId) {
      broker = await this.brokers.findOneBy({ id: dto.brokerId });
      if (!broker) throw new NotFoundException("Broker not found");
      if (!isBrokerActive(broker.contractFrom, broker.contractTo))
        throw new ConflictException({
          message: "Broker contract is not currently valid",
          error: ErrorCodes.BROKER_CONTRACT_EXPIRED,
        });
    }
    return this.ds.transaction(async (m) => {
      const deals = m.getRepository(DealEntity);
      const history = m.getRepository(DealStageHistoryEntity);
      const created = deals.create({
        ...dto,
        stage: dto.stage ?? "NEW",
        expectedValue: String(dto.expectedValue),
        client,
        broker,
        createdBy: { id: user.id } as any,
        currency: "QAR",
      });
      const saved = await deals.save(created);
      await history.save(
        history.create({
          deal: saved,
          fromStage: null,
          toStage: saved.stage,
          changedBy: { id: user.id } as any,
        }),
      );
      return this.findOne(saved.id, user);
    });
  }

  async update(id: string, dto: UpdateDealDto, user: AuthUser) {
    const existing = await this.loadForMutation(id);
    this.assertOwnerOrAdmin(existing, user);   // 403 NOT_DEAL_OWNER before visibility scoping
    if (dto.brokerId) {
      const broker = await this.brokers.findOneBy({ id: dto.brokerId });
      if (!broker) throw new NotFoundException("Broker not found");
      if (!isBrokerActive(broker.contractFrom, broker.contractTo))
        throw new ConflictException({
          message: "Broker contract is not currently valid",
          error: ErrorCodes.BROKER_CONTRACT_EXPIRED,
        });
    }
    const payload: any = { ...dto };
    if (dto.expectedValue !== undefined) payload.expectedValue = String(dto.expectedValue);
    if (dto.clientId !== undefined) payload.client = { id: dto.clientId };
    if (dto.brokerId !== undefined) payload.broker = dto.brokerId ? { id: dto.brokerId } : null;
    delete payload.clientId;
    delete payload.brokerId;
    await this.deals.update({ id }, payload);
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.loadForMutation(id);
    this.assertOwnerOrAdmin(existing, user);
    await this.deals.delete({ id });
    return { ok: true };
  }

  async updateStage(id: string, dto: UpdateStageDto, user: AuthUser) {
    const deal = await this.loadForMutation(id);
    this.assertOwnerOrAdmin(deal, user);
    const isTerminal = TERMINAL_STAGES.includes(dto.stage);
    const wasTerminal = TERMINAL_STAGES.includes(deal.stage);

    if (wasTerminal)
      throw new ConflictException({
        message: "Cannot change stage of a WON/LOST deal — use reopen",
        error: ErrorCodes.TERMINAL_STAGE_LOCKED,
      });
    if (isTerminal && !dto.confirmTerminal)
      throw new ConflictException({
        message: "Confirmation required to move deal to a terminal stage",
        error: ErrorCodes.TERMINAL_CONFIRMATION_REQUIRED,
      });
    if (deal.stage === dto.stage) return deal;

    return this.ds.transaction(async (m) => {
      const d = m.getRepository(DealEntity);
      const h = m.getRepository(DealStageHistoryEntity);
      await d.update({ id }, { stage: dto.stage });
      await h.save(
        h.create({
          deal: { id } as any,
          fromStage: deal.stage,
          toStage: dto.stage,
          changedBy: { id: user.id } as any,
        }),
      );
      return this.findOne(id, user);
    });
  }

  async reopen(id: string, user: AuthUser) {
    const deal = await this.loadForMutation(id);
    this.assertOwnerOrAdmin(deal, user);
    if (!TERMINAL_STAGES.includes(deal.stage))
      throw new ConflictException("Deal is not in a terminal stage");
    return this.ds.transaction(async (m) => {
      const d = m.getRepository(DealEntity);
      const h = m.getRepository(DealStageHistoryEntity);
      const next: DealStage = "NEGOTIATION";
      await d.update({ id }, { stage: next });
      await h.save(
        h.create({
          deal: { id } as any,
          fromStage: deal.stage,
          toStage: next,
          changedBy: { id: user.id } as any,
        }),
      );
      return this.findOne(id, user);
    });
  }

  async reassignOwner(id: string, userId: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new ForbiddenException();
    const deal = await this.deals.findOne({ where: { id } });
    if (!deal) throw new NotFoundException();
    await this.deals.update({ id }, { createdBy: { id: userId } as any });
    return this.findOne(id, actor);
  }

  async history(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.history.find({
      where: { deal: { id } },
      relations: ["changedBy"],
      order: { changedAt: "DESC" },
    });
  }

  private assertVisible(deal: DealEntity, user: AuthUser) {
    if (user.role !== "ADMIN" && deal.createdBy.id !== user.id)
      throw new NotFoundException();
  }
  private assertOwnerOrAdmin(deal: DealEntity, user: AuthUser) {
    if (user.role !== "ADMIN" && deal.createdBy.id !== user.id)
      throw new ForbiddenException({
        message: "You are not the owner of this deal",
        error: ErrorCodes.NOT_DEAL_OWNER,
      });
  }
}
```

- [ ] **Step 4:** Run unit test: `pnpm --filter @arafat/backend test deals.service`. Expected: all 9 tests PASS.

- [ ] **Step 5:** Commit:

```bash
git add backend/src/deals/deals.service.ts backend/src/deals/deals.service.spec.ts
git commit -m "feat(deals): stage transitions, reopen, ownership, broker validity"
```

### Task 6.3: Deals DTOs

**Files:**
- Create: `backend/src/deals/dto/create-deal.dto.ts`
- Create: `backend/src/deals/dto/update-deal.dto.ts`
- Create: `backend/src/deals/dto/update-stage.dto.ts`
- Create: `backend/src/deals/dto/reassign-owner.dto.ts`
- Create: `backend/src/deals/dto/list-deals-query.dto.ts`

- [ ] **Step 1:** DTOs with class-validator (pattern matches prior phases):

```ts
// create-deal.dto.ts
import {
  IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min,
} from "class-validator";
import { DealLocation, DealSpaceType, DealStage } from "@arafat/shared";

export class CreateDealDto {
  @IsUUID() clientId!: string;
  @IsOptional() @IsUUID() brokerId?: string | null;
  @IsOptional() @IsString() paymentTerms?: string | null;
  @IsNumber() @Min(0) expectedValue!: number;
  @IsDateString() expectedCloseDate!: string;
  @IsOptional() @IsIn([
    "NEW","QUALIFIED","MEETING","PROPOSAL","NEGOTIATION","CONTRACT",
  ]) stage?: DealStage;
  @IsIn(["BARWA_ALSADD","ELEMENT_WESTBAY","MARINA50_LUSAIL"]) location!: DealLocation;
  @IsIn(["WORKSTATION","OFFICE"]) spaceType!: DealSpaceType;
}
```

```ts
// update-deal.dto.ts
import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateDealDto } from "./create-deal.dto";
export class UpdateDealDto extends PartialType(OmitType(CreateDealDto, ["stage"] as const)) {}
```

```ts
// update-stage.dto.ts
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { DealStage } from "@arafat/shared";
export class UpdateStageDto {
  @IsIn(["NEW","QUALIFIED","MEETING","PROPOSAL","NEGOTIATION","CONTRACT","WON","LOST"])
  stage!: DealStage;
  @IsOptional() @IsBoolean() confirmTerminal?: boolean;
}
```

```ts
// reassign-owner.dto.ts
import { IsUUID } from "class-validator";
export class ReassignOwnerDto { @IsUUID() userId!: string; }
```

```ts
// list-deals-query.dto.ts
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from "class-validator";
import { ClientSource, DealLocation, DealStage } from "@arafat/shared";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListDealsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(["NEW","QUALIFIED","MEETING","PROPOSAL","NEGOTIATION","CONTRACT","WON","LOST"]) stage?: DealStage;
  @IsOptional() @IsIn(["BARWA_ALSADD","ELEMENT_WESTBAY","MARINA50_LUSAIL"]) location?: DealLocation;
  @IsOptional() @IsUUID() brokerId?: string;
  @IsOptional() @IsIn(["FACEBOOK","INSTAGRAM","TIKTOK","BROKER","GOOGLE"]) source?: ClientSource;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
```

- [ ] **Step 2:** Build: `pnpm --filter @arafat/backend build`. Expected: green.

- [ ] **Step 3:** Commit:

```bash
git add backend/src/deals/dto
git commit -m "feat(deals): add request DTOs"
```

### Task 6.4: Deals controller

**Files:**
- Create: `backend/src/deals/deals.controller.ts`
- Modify: `backend/src/deals/deals.module.ts`

- [ ] **Step 1:** `deals.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DealsService } from "./deals.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { ListDealsQueryDto } from "./dto/list-deals-query.dto";
import { ReassignOwnerDto } from "./dto/reassign-owner.dto";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("deals")
@ApiBearerAuth()
@Controller("deals")
export class DealsController {
  constructor(private svc: DealsService) {}

  @Get()
  list(@Query() q: ListDealsQueryDto, @CurrentUser() user: AuthUser) {
    return this.svc.findAll(q, user);
  }
  @Post()
  create(@Body() dto: CreateDealDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user);
  }
  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.findOne(id, user);
  }
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.update(id, dto, user);
  }
  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user);
  }
  @Patch(":id/stage")
  stage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.updateStage(id, dto, user);
  }
  @Post(":id/reopen")
  reopen(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.reopen(id, user);
  }
  @Roles("ADMIN")
  @Patch(":id/owner")
  reassign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReassignOwnerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.reassignOwner(id, dto.userId, user);
  }
  @Get(":id/history")
  history(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.svc.history(id, user);
  }
}
```

- [ ] **Step 2:** Register controller + service in `deals.module.ts`. Use `TypeOrmModule.forFeature([DealEntity, DealStageHistoryEntity, ClientEntity, BrokerEntity, UserEntity])` so every repository the service injects is available. Do **not** import `UsersModule`/`ClientsModule`/`BrokersModule` — they aren't needed (nothing is calling their services from here) and importing them creates pointless coupling.

- [ ] **Step 3:** Commit:

```bash
git add backend/src/deals/deals.controller.ts backend/src/deals/deals.module.ts
git commit -m "feat(deals): REST controller exposing CRUD, stage, reopen, reassign, history"
```

### Task 6.5: Deals e2e tests

**Files:**
- Create: `backend/test/deals.e2e-spec.ts`

- [ ] **Step 1:** Test cases (each seeds its own data via repositories):
  1. SALES user creates a deal and only they can see it; another SALES gets an empty list.
  2. ADMIN sees all deals from both users.
  3. PATCH `/deals/:id/stage` with `WON` no confirm → 409 `TERMINAL_CONFIRMATION_REQUIRED`.
  4. PATCH with `WON` + `confirmTerminal:true` → 200; GET `/deals/:id/history` shows 2 rows.
  5. PATCH stage on WON deal → 409 `TERMINAL_STAGE_LOCKED`.
  6. POST `/deals/:id/reopen` → 200; stage becomes NEGOTIATION.
  7. **GET** another user's deal as non-owner SALES → 404 (visibility scoping).
  8. **PATCH** another user's deal as non-owner SALES → 403 `NOT_DEAL_OWNER` (per `loadForMutation` ordering in Task 6.2). This is the only test that distinguishes 403-on-mutation from 404-on-read.
  9. Assigning an expired broker → 409 `BROKER_CONTRACT_EXPIRED`.
  10. **DELETE `/clients/:id` referenced by a deal → 409 `CLIENT_HAS_DEALS` with `details.dealsCount ≥ 1`.** This is the case deferred from Task 4.2 Step 8 — it lands here because the `deals` table now exists.
  11. ADMIN reassigns owner; original owner loses visibility, new owner gains it.

- [ ] **Step 2:** Run `pnpm --filter @arafat/backend test:e2e`. Expected: all previous e2e + new 10 PASS.

- [ ] **Step 3:** Commit:

```bash
git add backend/test/deals.e2e-spec.ts
git commit -m "test(deals): e2e coverage for ownership, stage rules, reopen, broker validity"
```

---

## Phase 7 — Dashboard + Reports

Goal: `GET /dashboard/stats` and four `/reports/*` endpoints, all role-scoped.

### Task 7.1: Dashboard module + stats service (TDD)

**Files:**
- Create: `backend/src/dashboard/dashboard.module.ts`
- Create: `backend/src/dashboard/dashboard.service.ts`
- Create: `backend/src/dashboard/dashboard.controller.ts`
- Create: `backend/src/dashboard/dashboard.service.spec.ts`

- [ ] **Step 1:** `dashboard.service.spec.ts` — paste the full body. Fixtures: 10 deals for sales1 (4 WON sum 100, 2 LOST, 4 open) and 5 for sales2 (1 WON 20).

```ts
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DashboardService } from "./dashboard.service";
import { DealEntity } from "../deals/entities/deal.entity";

function makeQb(row: { total: number; won: number; lost: number; revenue: string }) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(row),
  };
}

describe("DashboardService", () => {
  let svc: DashboardService;
  let repo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    repo = { createQueryBuilder: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [DashboardService, { provide: getRepositoryToken(DealEntity), useValue: repo }],
    }).compile();
    svc = mod.get(DashboardService);
  });

  it("ADMIN sees company-wide totals (no scope applied)", async () => {
    const qb = makeQb({ total: 15, won: 5, lost: 2, revenue: "120.00" });
    repo.createQueryBuilder.mockReturnValue(qb);
    const out = await svc.stats({ id: "admin", role: "ADMIN", email: "x" });
    expect(qb.where).not.toHaveBeenCalled();
    expect(out).toEqual({
      totalDeals: 15, wonDeals: 5, lostDeals: 2,
      revenueQar: "120.00",
      conversionRate: Number((5 / 7).toFixed(4)),
    });
  });

  it("SALES sees only own deals (created_by scope applied)", async () => {
    const qb = makeQb({ total: 10, won: 4, lost: 2, revenue: "100.00" });
    repo.createQueryBuilder.mockReturnValue(qb);
    const out = await svc.stats({ id: "sales1", role: "SALES", email: "x" });
    expect(qb.where).toHaveBeenCalledWith("d.created_by = :uid", { uid: "sales1" });
    expect(out).toEqual({
      totalDeals: 10, wonDeals: 4, lostDeals: 2,
      revenueQar: "100.00",
      conversionRate: 0.6667,
    });
  });

  it("conversion rate is 0 when no deals are closed", async () => {
    const qb = makeQb({ total: 3, won: 0, lost: 0, revenue: "0" });
    repo.createQueryBuilder.mockReturnValue(qb);
    const out = await svc.stats({ id: "u", role: "ADMIN", email: "x" });
    expect(out.conversionRate).toBe(0);
  });

  it("revenueQar preserves numeric(12,2) precision as string", async () => {
    const qb = makeQb({ total: 1, won: 1, lost: 0, revenue: "12345.67" });
    repo.createQueryBuilder.mockReturnValue(qb);
    const out = await svc.stats({ id: "u", role: "ADMIN", email: "x" });
    expect(out.revenueQar).toBe("12345.67");
  });
});
```

- [ ] **Step 2:** `dashboard.service.ts` uses a single query builder with `COUNT(*) FILTER (WHERE stage='WON')`, `FILTER (WHERE stage='LOST')`, `SUM(expected_value) FILTER (WHERE stage='WON')`. Apply `WHERE created_by = :uid` when role is SALES.

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DealEntity } from "../deals/entities/deal.entity";
import { AuthUser } from "../common/decorators/current-user.decorator";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DealEntity) private deals: Repository<DealEntity>,
  ) {}

  async stats(user: AuthUser) {
    const qb = this.deals
      .createQueryBuilder("d")
      .select(`COUNT(*)::int`, "total")
      .addSelect(`COUNT(*) FILTER (WHERE d.stage = 'WON')::int`, "won")
      .addSelect(`COUNT(*) FILTER (WHERE d.stage = 'LOST')::int`, "lost")
      .addSelect(
        `COALESCE(SUM(d.expected_value) FILTER (WHERE d.stage = 'WON'), 0)::text`,
        "revenue",
      );
    if (user.role !== "ADMIN") qb.where("d.created_by = :uid", { uid: user.id });
    const row = await qb.getRawOne<{
      total: number; won: number; lost: number; revenue: string;
    }>();
    const total = row?.total ?? 0;
    const won = row?.won ?? 0;
    const lost = row?.lost ?? 0;
    const closed = won + lost;
    return {
      totalDeals: total,
      wonDeals: won,
      lostDeals: lost,
      revenueQar: row?.revenue ?? "0",
      conversionRate: closed === 0 ? 0 : Number((won / closed).toFixed(4)),
    };
  }
}
```

- [ ] **Step 3:** Controller: `GET /dashboard/stats` → `svc.stats(user)`.

- [ ] **Step 4:** Run unit tests → PASS. Add one e2e (`test/dashboard.e2e-spec.ts`) that verifies role-scoped numbers differ.

- [ ] **Step 5:** Commit:

```bash
git add backend/src/dashboard backend/test/dashboard.e2e-spec.ts
git commit -m "feat(dashboard): stats endpoint with role scoping"
```

### Task 7.2: Reports module — 4 endpoints

**Files:**
- Create: `backend/src/reports/reports.module.ts`
- Create: `backend/src/reports/reports.service.ts`
- Create: `backend/src/reports/reports.controller.ts`
- Create: `backend/src/reports/dto/reports-query.dto.ts`
- Create: `backend/src/reports/reports.service.spec.ts`

- [ ] **Step 1:** `reports-query.dto.ts`:

```ts
import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";
import { DealLocation } from "@arafat/shared";

export class ReportsQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(["BARWA_ALSADD","ELEMENT_WESTBAY","MARINA50_LUSAIL"]) location?: DealLocation;
  @IsOptional() @IsUUID() brokerId?: string;
}
```

- [ ] **Step 2:** `reports.service.ts` provides four methods (shapes must match `WinLossReportDto`, `ByLocationReportDto`, `BySourceReportDto`, `RevenueTimeseriesPointDto` from `@arafat/shared`):
  - `winLoss(q, user)` — `{ won, lost, revenueQar }`. No `openDeals` field (spec §6.4).
  - `byLocation(q, user)` — one row per `DealLocation` with `{ won, lost }`; zero-fill missing locations.
  - `bySource(q, user)` — one row per `ClientSource` with `{ won, lost }`; zero-fill missing sources (requires join to `clients.source`).
  - `revenueTimeseries(q, user)` — `date_trunc('month', expected_close_date)` for WON deals, buckets filled for empty months across `[from, to]`. **UX default (plan-level, not in spec):** when `from` and `to` are both absent, default to the last 6 calendar months ending today. Document this in the Swagger `@ApiQuery` description. Spec §6.4 keeps `bucket = month` fixed; do not expose `bucket` as a query param.

  All methods apply role scope (`WHERE created_by = :uid` when SALES).

  Use the QueryBuilder with parameterised dates. For timeseries, resolve missing months client-side (iterate from → to monthly, merge with aggregated rows).

- [ ] **Step 3:** `reports.service.spec.ts` — paste the bodies; do not leave prose-only assertions:

```ts
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ReportsService } from "./reports.service";
import { DealEntity } from "../deals/entities/deal.entity";

function qbFactory(rows: any[]) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn().mockResolvedValue(rows[0] ?? {}),
  };
}

describe("ReportsService", () => {
  let svc: ReportsService;
  let repo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    repo = { createQueryBuilder: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [ReportsService, { provide: getRepositoryToken(DealEntity), useValue: repo }],
    }).compile();
    svc = mod.get(ReportsService);
  });

  it("winLoss returns { won, lost, revenueQar } shape (no openDeals)", async () => {
    repo.createQueryBuilder.mockReturnValue(qbFactory([{ won: 4, lost: 2, revenue_qar: "100.00" }]));
    const out = await svc.winLoss({}, { id: "admin", role: "ADMIN", email: "x" });
    expect(out).toEqual({ won: 4, lost: 2, revenueQar: "100.00" });
    expect(out).not.toHaveProperty("openDeals");
  });

  it("byLocation zero-fills missing locations", async () => {
    repo.createQueryBuilder.mockReturnValue(qbFactory([
      { location: "BARWA_ALSADD", won: 2, lost: 1 },
    ]));
    const out = await svc.byLocation({}, { id: "admin", role: "ADMIN", email: "x" });
    const locs = out.map(r => r.location).sort();
    expect(locs).toEqual(["BARWA_ALSADD", "ELEMENT_WESTBAY", "MARINA50_LUSAIL"]);
    expect(out.find(r => r.location === "ELEMENT_WESTBAY")).toEqual({ location: "ELEMENT_WESTBAY", won: 0, lost: 0 });
  });

  it("bySource zero-fills all 5 ClientSource values", async () => {
    repo.createQueryBuilder.mockReturnValue(qbFactory([{ source: "GOOGLE", won: 1, lost: 0 }]));
    const out = await svc.bySource({}, { id: "admin", role: "ADMIN", email: "x" });
    const srcs = out.map(r => r.source).sort();
    expect(srcs).toEqual(["BROKER","FACEBOOK","GOOGLE","INSTAGRAM","TIKTOK"]);
  });

  it("revenueTimeseries defaults to last 6 months when no from/to given", async () => {
    const qb = qbFactory([]);
    repo.createQueryBuilder.mockReturnValue(qb);
    const out = await svc.revenueTimeseries({}, { id: "admin", role: "ADMIN", email: "x" });
    expect(out).toHaveLength(6);     // zero-filled
    // buckets are YYYY-MM, strictly ascending
    expect(out.map(p => p.bucket)).toEqual([...out.map(p => p.bucket)].sort());
  });

  it("revenueTimeseries merges DB rows onto the zero-fill grid", async () => {
    const today = new Date();
    const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    repo.createQueryBuilder.mockReturnValue(qbFactory([
      { bucket: ym(lastMonth), revenue_qar: "50.00", won_count: 1 },
    ]));
    const out = await svc.revenueTimeseries({}, { id: "admin", role: "ADMIN", email: "x" });
    const hit = out.find(p => p.bucket === ym(lastMonth));
    expect(hit).toBeDefined();
    expect(hit!.revenueQar).toBe("50.00");
  });

  it("role scope applies created_by when SALES", async () => {
    const qb = qbFactory([{ won: 0, lost: 0, revenue_qar: "0" }]);
    repo.createQueryBuilder.mockReturnValue(qb);
    await svc.winLoss({}, { id: "s1", role: "SALES", email: "x" });
    const calls = qb.andWhere.mock.calls.flat().map(String).join("|");
    expect(calls).toMatch(/created_by/);
  });
});
```

- [ ] **Step 4:** Controller exposes:
  - `GET /reports/win-loss`
  - `GET /reports/by-location`
  - `GET /reports/by-source`
  - `GET /reports/revenue-timeseries`

  Use `ReportsQueryDto` for all; `revenue-timeseries` implicitly uses `bucket=month`.

- [ ] **Step 5:** Add `test/reports.e2e-spec.ts`: smoke each endpoint returns 200 for both roles with different shapes.

- [ ] **Step 6:** Commit:

```bash
git add backend/src/reports backend/test/reports.e2e-spec.ts
git commit -m "feat(reports): win-loss, by-location, by-source, revenue-timeseries"
```

---

## Phase 8 — Seed script + final backend integration

### Task 8.1: Seed script

**Files:**
- Create: `backend/seed/seed.ts`

- [ ] **Step 1:** Implement seed using `AppDataSource.initialize()` + repositories. Truncate order: `deal_stage_history`, `deals`, `brokers`, `clients`, `users`.

- [ ] **Step 2:** Insert:
  - 3 users (credentials in spec §10; `bcrypt.hash(pw, 12)`).
  - 10 clients, sources round-robin across the 5 enum values.
  - 3 brokers: active (contract_to = today + 180d), expiring-soon (today + 30d), expired (today − 30d).
  - 25 deals:
    - distribution: `[NEW ×4, QUALIFIED ×4, MEETING ×3, PROPOSAL ×3, NEGOTIATION ×3, CONTRACT ×2, WON ×4, LOST ×2]`.
    - 4 WON deals' `expected_close_date` set to month offsets `t-1, t-2, t-3, t-4` from today (use `date-fns` or manual date math with `new Date()`) so the timeseries chart shows a non-trivial trend.
    - `created_by` 15 for sales1, 10 for sales2.
    - Random sensible `expected_value` 8000–120000, rounded to nearest 1000.
    - Locations and space types round-robin.
    - `broker_id` null for ~half, else the active broker; include one expired-broker historical deal via direct insert (bypasses service) to exercise greyed-out UI.
  - For each deal, insert initial `deal_stage_history(fromStage=null, toStage=<stage>, changed_by=created_by)`. For 4 of the WON/LOST deals, append 2 extra history rows showing a past progression (e.g. `NEW→MEETING`, `MEETING→WON`) with plausible timestamps.

- [ ] **Step 3:** Run `pnpm --filter @arafat/backend seed`. Expected: log summary counts, exit 0.

- [ ] **Step 4:** Verify via psql or `GET /api/v1/deals` with admin token.

- [ ] **Step 5:** Commit:

```bash
git add backend/seed/seed.ts
git commit -m "feat(seed): deterministic demo data for all entities"
```

### Task 8.2: Backend integration smoke

- [ ] **Step 1:** Reset DB: `docker compose down -v && docker compose up -d postgres`.
- [ ] **Step 2:** `pnpm migration:run && pnpm seed`.
- [ ] **Step 3:** Start: `pnpm --filter @arafat/backend dev`.
- [ ] **Step 4:** Manual hit through curl or Swagger:
  - login as admin → token.
  - `GET /deals` with token returns 25.
  - `PATCH /deals/<id>/stage` to WON with `confirmTerminal:true` → 200 + new history row.
  - `GET /dashboard/stats` as admin vs as sales1 → different numbers.
  - `GET /reports/revenue-timeseries?from=<6mo ago>&to=<today>` returns 6 months of data, some non-zero.
- [ ] **Step 5:** `pnpm --filter @arafat/backend test && pnpm --filter @arafat/backend test:e2e` — all green.
- [ ] **Step 6:** Commit any fixups.

```bash
git commit --allow-empty -m "chore: backend integration checkpoint — all suites green"
```

---

## Phase 9 — Frontend scaffolding

Goal: Vite + React + Tailwind + TailAdmin Pro base boots at `/`, with API client, auth context, router shell, and design tokens configured. No pages yet beyond a placeholder Login.

### Task 9.1: Initialize Vite app

**Commit cadence note:** like Task 2.1, this one bundles manifests, config, Tailwind tokens, and provider wiring. Commit after package+config land, again after Tailwind renders the splash, and again once providers wrap `App`. Three commits. Do not lump everything into one.

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/postcss.config.cjs`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/.env.example`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1:** `frontend/package.json`:

```json
{
  "name": "@arafat/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "@arafat/shared": "workspace:*",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@hookform/resolvers": "^3.3.4",
    "@tanstack/react-query": "^5.28.0",
    "@tanstack/react-query-devtools": "^5.28.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.51.0",
    "react-router-dom": "^6.22.3",
    "recharts": "^2.12.3",
    "sonner": "^1.4.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@typescript-eslint/eslint-plugin": "^7.3.1",
    "@typescript-eslint/parser": "^7.3.1",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.6",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "5.5.4",
    "vite": "^5.2.6"
  }
}
```

- [ ] **Step 2:** `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@arafat/shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
  server: {
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    proxy: {
      "/api": { target: process.env.VITE_API_URL ?? "http://localhost:3000", changeOrigin: true },
    },
  },
});
```

- [ ] **Step 3:** `tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@arafat/shared": ["../packages/shared/src"]
    },
    "noEmit": true,
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "useDefineForClassFields": true
  },
  "include": ["src", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4:** `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5:** `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ArafatCRM</title>
  </head>
  <body class="bg-surface text-ink">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6:** `postcss.config.cjs`:

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 7:** `tailwind.config.ts` — design tokens from spec §7.1:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          tint: "#DBEAFE",
        },
        ink: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        surface: "#F8FAFC",
        success: "#10B981",
        danger: "#EF4444",
      },
      borderRadius: { card: "12px", field: "8px" },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 8:** `frontend/.env.example`:

```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=ArafatCRM
```

- [ ] **Step 9:** `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root { height: 100%; }
  body { @apply font-sans text-ink bg-surface antialiased; }
}
```

- [ ] **Step 10:** `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { App } from "./App";
import { AuthProvider } from "./lib/auth/AuthContext";
import "./index.css";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 11:** `src/App.tsx` placeholder:

```tsx
export function App() {
  return <div className="p-8">ArafatCRM bootstrapped.</div>;
}
```

- [ ] **Step 12:** `cp frontend/.env.example frontend/.env`. Run `pnpm --filter @arafat/frontend dev`. Visit `http://localhost:5173` — expect the placeholder text. Stop.

- [ ] **Step 13:** Commit:

```bash
git add frontend pnpm-lock.yaml
git commit -m "feat(frontend): scaffold Vite + React + Tailwind with design tokens"
```

### Task 9.2: API client + auth context + protected route

**Files:**
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/endpoints.ts`
- Create: `frontend/src/lib/auth/AuthContext.tsx`
- Create: `frontend/src/lib/auth/ProtectedRoute.tsx`
- Create: `frontend/src/lib/auth/useAuth.ts`

- [ ] **Step 1:** `client.ts` — typed fetch wrapper that attaches `Authorization` and normalizes errors:

```ts
import { ApiError } from "@arafat/shared";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiClientError extends Error {
  constructor(public status: number, public body: ApiError) {
    super(body.message);
  }
}

type Opts = Omit<RequestInit, "body"> & { body?: unknown; token?: string | null };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      statusCode: res.status, message: res.statusText, error: "Unknown",
    }))) as ApiError;
    throw new ApiClientError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

- [ ] **Step 2:** `endpoints.ts` — thin wrappers per resource (example):

```ts
import {
  AuthResponse, ClientDto, CreateClientDto, DashboardStatsDto, DealDto,
  LoginDto, Paginated, UpdateClientDto, UpdateStageDto, UserDto,
  DealStageHistoryDto, BrokerDto, CreateBrokerDto, UpdateBrokerDto,
  CreateDealDto, UpdateDealDto, ReassignOwnerDto,
  WinLossReportDto, ByLocationReportDto, BySourceReportDto, RevenueTimeseriesPointDto,
  CreateUserDto, UpdateUserDto, RegisterDto,
} from "@arafat/shared";
import { api } from "./client";

export const endpoints = {
  auth: {
    login: (dto: LoginDto) => api<AuthResponse>("/auth/login", { method: "POST", body: dto }),
    register: (dto: RegisterDto) => api<AuthResponse>("/auth/register", { method: "POST", body: dto }),
    me: (token: string) => api<UserDto>("/auth/me", { token }),
  },
  clients: {
    list: (q: URLSearchParams, token: string) =>
      api<Paginated<ClientDto>>(`/clients?${q}`, { token }),
    create: (dto: CreateClientDto, token: string) =>
      api<ClientDto>("/clients", { method: "POST", body: dto, token }),
    update: (id: string, dto: UpdateClientDto, token: string) =>
      api<ClientDto>(`/clients/${id}`, { method: "PATCH", body: dto, token }),
    remove: (id: string, token: string) =>
      api<{ ok: true }>(`/clients/${id}`, { method: "DELETE", token }),
  },
  brokers: { /* mirror clients */ },
  deals: {
    list: (q: URLSearchParams, token: string) =>
      api<Paginated<DealDto>>(`/deals?${q}`, { token }),
    get: (id: string, token: string) => api<DealDto>(`/deals/${id}`, { token }),
    create: (dto: CreateDealDto, token: string) =>
      api<DealDto>("/deals", { method: "POST", body: dto, token }),
    update: (id: string, dto: UpdateDealDto, token: string) =>
      api<DealDto>(`/deals/${id}`, { method: "PATCH", body: dto, token }),
    remove: (id: string, token: string) =>
      api<{ ok: true }>(`/deals/${id}`, { method: "DELETE", token }),
    stage: (id: string, dto: UpdateStageDto, token: string) =>
      api<DealDto>(`/deals/${id}/stage`, { method: "PATCH", body: dto, token }),
    reopen: (id: string, token: string) =>
      api<DealDto>(`/deals/${id}/reopen`, { method: "POST", token }),
    reassign: (id: string, dto: ReassignOwnerDto, token: string) =>
      api<DealDto>(`/deals/${id}/owner`, { method: "PATCH", body: dto, token }),
    history: (id: string, token: string) =>
      api<DealStageHistoryDto[]>(`/deals/${id}/history`, { token }),
  },
  dashboard: {
    stats: (token: string) => api<DashboardStatsDto>("/dashboard/stats", { token }),
  },
  reports: {
    winLoss: (q: URLSearchParams, t: string) => api<WinLossReportDto>(`/reports/win-loss?${q}`, { token: t }),
    byLocation: (q: URLSearchParams, t: string) => api<ByLocationReportDto[]>(`/reports/by-location?${q}`, { token: t }),
    bySource: (q: URLSearchParams, t: string) => api<BySourceReportDto[]>(`/reports/by-source?${q}`, { token: t }),
    revenueTimeseries: (q: URLSearchParams, t: string) => api<RevenueTimeseriesPointDto[]>(`/reports/revenue-timeseries?${q}`, { token: t }),
  },
  users: {
    list: (q: URLSearchParams, t: string) => api<Paginated<UserDto>>(`/users?${q}`, { token: t }),
    create: (dto: CreateUserDto, t: string) => api<UserDto>("/users", { method: "POST", body: dto, token: t }),
    update: (id: string, dto: UpdateUserDto, t: string) => api<UserDto>(`/users/${id}`, { method: "PATCH", body: dto, token: t }),
    remove: (id: string, t: string) => api<{ ok: true }>(`/users/${id}`, { method: "DELETE", token: t }),
  },
};
```

Fill in `brokers` per the same pattern.

- [ ] **Step 3:** `AuthContext.tsx`:

```tsx
import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { UserDto } from "@arafat/shared";
import { endpoints } from "../api/endpoints";

type AuthState = {
  token: string | null;
  user: UserDto | null;
  status: "loading" | "authed" | "anon";
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthCtx = createContext<AuthState>({} as AuthState);
const TOKEN_KEY = "arafat.token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  useEffect(() => {
    if (!token) { setStatus("anon"); return; }
    endpoints.auth.me(token)
      .then((u) => { setUser(u); setStatus("authed"); })
      .catch(() => { setToken(null); localStorage.removeItem(TOKEN_KEY); setStatus("anon"); });
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await endpoints.auth.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    setStatus("authed");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null); setUser(null); setStatus("anon");
  }, []);

  const value = useMemo<AuthState>(() => ({ token, user, status, login, logout }), [token, user, status, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
```

- [ ] **Step 4:** `useAuth.ts`:

```ts
import { useContext } from "react";
import { AuthCtx } from "./AuthContext";
export const useAuth = () => useContext(AuthCtx);
```

- [ ] **Step 5a:** `frontend/src/pages/NotFound.tsx` — shared 404 UI used everywhere the user lands somewhere they shouldn't:

```tsx
import { Link } from "react-router-dom";
export function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl font-semibold text-ink mb-2">404</div>
      <p className="text-muted mb-6">Sorry, we couldn't find that page.</p>
      <Link to="/" className="rounded-field bg-brand hover:bg-brand-hover text-white px-4 py-2">
        Back to dashboard
      </Link>
    </div>
  );
}
```

- [ ] **Step 5b:** `ProtectedRoute.tsx` — reuse `NotFound` for admin-only denials (matches spec §7.2 "non-admins get 404 UI") and for the catch-all `*` route:

```tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { NotFound } from "../../pages/NotFound";

export function ProtectedRoute({ adminOnly }: { adminOnly?: boolean }) {
  const { status, user } = useAuth();
  const loc = useLocation();
  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (status === "anon") return <Navigate to="/login" replace state={{ from: loc }} />;
  if (adminOnly && user?.role !== "ADMIN") return <NotFound />;
  return <Outlet />;
}
```

- [ ] **Step 6:** Commit:

```bash
git add frontend/src/lib
git commit -m "feat(frontend): API client, auth context, protected routes"
```

### Task 9.3: Router skeleton + layout shell + placeholder pages

**Files:**
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/layouts/AppLayout.tsx`
- Create: `frontend/src/layouts/Sidebar.tsx`
- Create: `frontend/src/layouts/TopBar.tsx`
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Dashboard.tsx` (placeholder)
- Create: `frontend/src/pages/Pipeline.tsx` (placeholder)
- Create: `frontend/src/pages/Deals.tsx` (placeholder)
- Create: `frontend/src/pages/DealDetail.tsx` (placeholder)
- Create: `frontend/src/pages/Clients.tsx` (placeholder)
- Create: `frontend/src/pages/Brokers.tsx` (placeholder)
- Create: `frontend/src/pages/Reports.tsx` (placeholder)
- Create: `frontend/src/pages/Users.tsx` (placeholder)
- Create: `frontend/src/pages/NotFound.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1:** Port TailAdmin sidebar/topbar markup from `tailadmin-source/.../src/layout/` into `Sidebar.tsx` and `TopBar.tsx`. Trim to our nav items (Dashboard · Pipeline · Deals · Clients · Brokers · Reports · Users [admin-only]). Apply our design tokens (no gradients, `rounded-card`, `shadow-card`).

- [ ] **Step 2:** `AppLayout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3:** `router.tsx`:

```tsx
import { Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Pipeline } from "./pages/Pipeline";
import { Deals } from "./pages/Deals";
import { DealDetail } from "./pages/DealDetail";
import { Clients } from "./pages/Clients";
import { Brokers } from "./pages/Brokers";
import { Reports } from "./pages/Reports";
import { Users } from "./pages/Users";
import { NotFound } from "./pages/NotFound";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./lib/auth/ProtectedRoute";

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/brokers" element={<Brokers />} />
          <Route path="/reports" element={<Reports />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 4:** Replace `App.tsx` body with `<Router />`.

- [ ] **Step 5:** Minimal `Login.tsx` — React Hook Form, posts to `auth.login`, stores via `useAuth().login`, redirects to `/`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormData = z.infer<typeof schema>;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    try { await login(values.email, values.password); navigate("/"); }
    catch (e: any) { toast.error(e.body?.message ?? "Login failed"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form onSubmit={form.handleSubmit(onSubmit)}
        className="bg-white rounded-card shadow-card p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-ink">Sign in to ArafatCRM</h1>
        <input {...form.register("email")} placeholder="Email"
          className="w-full rounded-field border border-border px-3 py-2" />
        <input {...form.register("password")} type="password" placeholder="Password"
          className="w-full rounded-field border border-border px-3 py-2" />
        <button type="submit" disabled={form.formState.isSubmitting}
          className="w-full rounded-field bg-brand hover:bg-brand-hover text-white py-2">
          Sign in
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6:** Placeholder pages (`export function X() { return <h1 className="text-xl font-semibold">X</h1>; }`) so routing compiles.

- [ ] **Step 7:** `pnpm --filter @arafat/frontend dev`. Verify:
  - `/login` renders the form.
  - Login with `admin@arafat.qa / Admin@123` → redirect to `/`, shell appears.
  - Clicking sidebar items navigates to placeholder pages.
  - `/users` as SALES → "Not found". As ADMIN → placeholder.

- [ ] **Step 8:** Commit:

```bash
git add frontend/src
git commit -m "feat(frontend): router, layout shell, login, placeholder pages"
```

### Task 9.4: Base primitive components

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Select.tsx`
- Create: `frontend/src/components/ui/Textarea.tsx`
- Create: `frontend/src/components/ui/DatePicker.tsx`
- Create: `frontend/src/components/ui/Modal.tsx`
- Create: `frontend/src/components/ui/ConfirmDialog.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/Tabs.tsx`
- Create: `frontend/src/components/ui/Tooltip.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Create: `frontend/src/components/ui/ErrorState.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`
- Create: `frontend/src/components/ui/index.ts`

- [ ] **Step 1:** Port the corresponding TailAdmin components from `tailadmin-source/.../src/components/` where available; simplify each to expose a typed React component using our tokens. Each file stays under ~80 lines.

- [ ] **Step 2:** Where TailAdmin doesn't have a direct match (e.g., `EmptyState`, `ErrorState`, `Skeleton`), implement minimal versions:

```tsx
// EmptyState.tsx
export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand-tint" />
      <p className="text-muted">{title}</p>
      {action}
    </div>
  );
}
```

```tsx
// ErrorState.tsx
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="py-16 text-center space-y-3">
      <p className="text-danger">Something went wrong.</p>
      {onRetry && <button onClick={onRetry} className="text-brand">Retry</button>}
    </div>
  );
}
```

```tsx
// Skeleton.tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-border rounded-field ${className}`} />;
}
```

- [ ] **Step 3:** `Modal.tsx` — simple controlled modal; locks body scroll while open; Escape closes. Render via `createPortal` to `#root`.

- [ ] **Step 4:** `ConfirmDialog.tsx` — wraps `Modal` with title, body text, Cancel / Confirm buttons; confirm can be destructive (red).

- [ ] **Step 5:** `index.ts` re-exports everything.

- [ ] **Step 6:** Visual smoke: create a temporary route `/__ui` (locally, not committed) that renders each component. Verify spacing, tokens, focus rings. Delete the route after.

- [ ] **Step 7:** Commit:

```bash
git add frontend/src/components/ui
git commit -m "feat(frontend): primitive UI components with design tokens"
```

---

## Phase 10 — Layout refinement + Login polish

### Task 10.1: Sidebar nav + active-state styling

**Files:**
- Modify: `frontend/src/layouts/Sidebar.tsx`

- [ ] **Step 1:** Define nav array:

```ts
const nav = [
  { to: "/", label: "Dashboard", icon: IconHome },
  { to: "/pipeline", label: "Pipeline", icon: IconColumns },
  { to: "/deals", label: "Deals", icon: IconBriefcase },
  { to: "/clients", label: "Clients", icon: IconUsers },
  { to: "/brokers", label: "Brokers", icon: IconHandshake },
  { to: "/reports", label: "Reports", icon: IconChartBar },
];
```

Icons: inline SVG components or `lucide-react` (add dep: `pnpm --filter @arafat/frontend add lucide-react`).

- [ ] **Step 2:** Render each item via `<NavLink>`; active state: `bg-brand-tint text-brand`.

- [ ] **Step 3:** Append `{ to: "/users", label: "Users", icon: IconShield }` when `user?.role === "ADMIN"`.

- [ ] **Step 4:** Commit.

### Task 10.2: TopBar — search, user menu, logout

**Files:**
- Modify: `frontend/src/layouts/TopBar.tsx`

- [ ] **Step 1:** Search input on the left: on Enter, `navigate('/deals?q=<value>')`.
- [ ] **Step 2:** User menu on the right: avatar + name; popover with "Sign out" → `logout()` + redirect to `/login`.
- [ ] **Step 3:** Show role badge next to name (`ADMIN` blue, `SALES` muted).
- [ ] **Step 4:** Commit.

### Task 10.3: Login polish

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1:** Replace raw inputs with `Input`/`Button` components; show inline field errors from Zod (`form.formState.errors.email?.message`).
- [ ] **Step 2:** Add "Create account" link that toggles to a register form (same screen, same submit handler, different endpoint).
- [ ] **Step 3:** After failed login, display inline form-level error (`<p className="text-danger text-sm">`).
- [ ] **Step 4:** Manual verify happy and unhappy paths. Commit.

---

## Phase 11 — Clients page

Goal: list + add/edit modal + delete with 409 toast.

### Task 11.1: `DataTable` component

**Files:**
- Create: `frontend/src/components/data-table/DataTable.tsx`
- Create: `frontend/src/components/data-table/types.ts`

- [ ] **Step 1:** `types.ts`:

```ts
export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  error?: unknown;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  onRetry?: () => void;
}
```

- [ ] **Step 2:** `DataTable.tsx`:

```tsx
import { DataTableProps } from "./types";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui";

export function DataTable<T extends { id: string }>({
  columns, rows, isLoading, error, onRowClick, empty, onRetry,
}: DataTableProps<T>) {
  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  if (error) return <ErrorState onRetry={onRetry} />;
  if (rows.length === 0) return empty ?? <EmptyState title="No results" />;
  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className="text-left font-medium px-4 py-3">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}
              className={`border-b border-border last:border-0 ${onRowClick ? "cursor-pointer hover:bg-surface" : ""}`}
              onClick={() => onRowClick?.(row)}>
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2:** Commit.

### Task 11.2: Clients list + filters + modal

**Files:**
- Modify: `frontend/src/pages/Clients.tsx`
- Create: `frontend/src/features/clients/ClientForm.tsx`
- Create: `frontend/src/features/clients/clientSchema.ts`
- Create: `frontend/src/features/clients/useClientsQuery.ts`

- [ ] **Step 1:** `clientSchema.ts`:

```ts
import { z } from "zod";
import { ClientSource } from "@arafat/shared";
export const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().optional().or(z.literal("")),
  source: z.nativeEnum(ClientSource),
});
export type ClientFormValues = z.infer<typeof clientSchema>;
```

- [ ] **Step 2:** `useClientsQuery.ts` — wraps TanStack Query around `endpoints.clients.list`, exposes `data, isLoading, refetch`; accepts filters and URL-param builder.

- [ ] **Step 3:** `ClientForm.tsx` — reusable create/edit form. Props `{ initial?: ClientDto, onSubmit, onCancel }`. Uses React Hook Form + Zod.

- [ ] **Step 4:** `Clients.tsx` page:
  - Top bar: search input (debounced 250ms), source filter `Select`, "New Client" button.
  - `DataTable` columns: name, company, phone, email, source (Badge), created date. Row click opens edit modal.
  - "New Client" opens modal with empty `ClientForm`; on submit, POST; invalidate query.
  - Edit modal same form with pre-filled values; PATCH on submit.
  - Delete via a trash icon in the row's action cell → `ConfirmDialog` → DELETE; on 409 `CLIENT_HAS_DEALS`, toast uses `err.body.message`.

- [ ] **Step 5:** Manual test: CRUD, search, filter, 409 toast (attempt to delete a client with seeded deals). Empty state shows when filters yield zero.

- [ ] **Step 6:** Commit:

```bash
git add frontend/src/features/clients frontend/src/pages/Clients.tsx frontend/src/components/data-table
git commit -m "feat(frontend): clients page with list, filters, add/edit modal, delete 409 toast"
```

---

## Phase 12 — Brokers page

Goal: list with "only active" toggle, add/edit modal, admin-only delete, expired brokers rendered muted.

### Task 12.1: Brokers page

**Files:**
- Modify: `frontend/src/pages/Brokers.tsx`
- Create: `frontend/src/features/brokers/BrokerForm.tsx`
- Create: `frontend/src/features/brokers/brokerSchema.ts`
- Create: `frontend/src/features/brokers/useBrokersQuery.ts`

- [ ] **Step 1:** `brokerSchema.ts`:

```ts
import { z } from "zod";
export const brokerSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(1),
    company: z.string().optional().or(z.literal("")),
    contractFrom: z.string().min(1),
    contractTo: z.string().min(1),
  })
  .refine((v) => v.contractTo >= v.contractFrom, {
    path: ["contractTo"],
    message: "End date must be on/after start date",
  });
export type BrokerFormValues = z.infer<typeof brokerSchema>;
```

- [ ] **Step 2:** `useBrokersQuery.ts` — accepts `{ q, onlyActive, page }`, returns paginated brokers.

- [ ] **Step 3:** `BrokerForm.tsx` — two date inputs plus text fields; submit disabled while pending.

- [ ] **Step 4:** `Brokers.tsx`:
  - Filter bar: search + toggle "Only active".
  - DataTable columns: name, company, phone, `contractFrom → contractTo`, `Active` / `Expired` badge, actions.
  - Row class: `opacity-60` when `!row.isActive`; add an `Expired` badge.
  - "New Broker" modal; edit modal; delete visible only for `user.role === 'ADMIN'`.
  - On DELETE non-admin attempt, hide the button rather than rely on 403.

- [ ] **Step 5:** Manual verify including seeded expired broker.

- [ ] **Step 6:** Commit:

```bash
git add frontend/src/features/brokers frontend/src/pages/Brokers.tsx
git commit -m "feat(frontend): brokers page with active filter and admin-only delete"
```

---

## Phase 13 — Deals list + Deal detail page

Goal: `/deals` list with full filter set, `/deals/:id` detail page with form + stage history timeline. Pipeline/kanban is Phase 14.

### Task 13.1: Deals list page

**Files:**
- Modify: `frontend/src/pages/Deals.tsx`
- Create: `frontend/src/features/deals/useDealsQuery.ts`
- Create: `frontend/src/features/deals/DealFiltersBar.tsx`
- Create: `frontend/src/features/deals/StageBadge.tsx`

- [ ] **Step 1:** `StageBadge.tsx` — colored badge per stage (NEW: muted, QUALIFIED: sky, MEETING: indigo, PROPOSAL: violet, NEGOTIATION: amber, CONTRACT: emerald, WON: green, LOST: red). Use a Tailwind map.

- [ ] **Step 2:** `DealFiltersBar.tsx` — search input + selects for stage, location, broker, source + date range inputs. Controlled by URL search params so refreshing preserves filters.

- [ ] **Step 3:** `useDealsQuery.ts` — wrap `endpoints.deals.list`. **Standardise the query key shape to `['deals', filtersObj]`** (not a stringified URL) so every invalidation and `setQueriesData({ queryKey: ['deals'] })` in later tasks (Phase 14 kanban optimistic updates in particular) hits the same cache entries. Invalidations elsewhere use `{ queryKey: ['deals'] }` without a second element; the prefix match will sweep all deal list queries.

  ```ts
  export function useDealsQuery(filters: DealFilters) {
    return useQuery({
      queryKey: ['deals', filters],
      queryFn: ({ signal }) => endpoints.deals.list(filters, { signal }),
      placeholderData: keepPreviousData,
    });
  }
  ```

  The kanban page in Phase 14 uses the same key shape with `{ limit: 500 }` as its only filter — that way a successful stage mutation's `invalidateQueries({ queryKey: ['deals'] })` refreshes both the list and the kanban.

- [ ] **Step 4:** `Deals.tsx`:
  - Header row with `DealFiltersBar` + "New Deal" button.
  - `DataTable` columns: Client, Company, Value QAR, Stage (StageBadge), Location, Close Date, Owner.
  - Click row → `navigate('/deals/:id')`.
  - "New Deal" opens `DealForm` in a modal; on submit, POST then navigate to detail.
  - Pagination footer using total / page / limit.

- [ ] **Step 5:** Commit.

### Task 13.2: `DealForm` (create + edit)

**Files:**
- Create: `frontend/src/features/deals/DealForm.tsx`
- Create: `frontend/src/features/deals/dealSchema.ts`

- [ ] **Step 1:** `dealSchema.ts`:

```ts
import { z } from "zod";
import { DealLocation, DealSpaceType } from "@arafat/shared";
export const dealSchema = z.object({
  clientId: z.string().uuid(),
  brokerId: z.string().uuid().nullable().optional(),
  paymentTerms: z.string().optional().or(z.literal("")),
  expectedValue: z.coerce.number().nonnegative(),
  expectedCloseDate: z.string().min(1),
  location: z.nativeEnum(DealLocation),
  spaceType: z.nativeEnum(DealSpaceType),
});
export type DealFormValues = z.infer<typeof dealSchema>;
```

- [ ] **Step 2:** `DealForm.tsx`:
  - Client picker: searchable select (query the clients endpoint with `q`); displays name + company.
  - Broker picker: searchable; by default filters to `onlyActive`; disable expired options with a tooltip "Contract expired".
  - Text/number/date inputs for the remainder.
  - Currency shown as a read-only "QAR" label (per spec §8.1).
  - Submit prop `onSubmit(values)`; form owns validation and submit-pending state.

- [ ] **Step 3:** Wire `DealForm` into the new-deal modal in `Deals.tsx`. On submit: POST, invalidate `['deals']`, close modal, toast success.

- [ ] **Step 4:** Commit.

### Task 13.3: Deal detail page

**Files:**
- Modify: `frontend/src/pages/DealDetail.tsx`
- Create: `frontend/src/features/deals/StageHistoryTimeline.tsx`
- Create: `frontend/src/features/deals/DealHeader.tsx`
- Create: `frontend/src/features/deals/ReassignOwnerDialog.tsx`

- [ ] **Step 1:** `StageHistoryTimeline.tsx` — vertical list of history rows; each: `<from> → <to>` using `StageBadge`, user name, relative time via `date-fns/formatDistanceToNow`. Loading skeleton if fetching. Newest first.

- [ ] **Step 2:** `DealHeader.tsx` — client name (large), company, stage badge, close date, expected value. Right-side buttons: `Reopen` (visible when `stage in [WON, LOST]`) and `Reassign owner` (admin-only). Reopen mutates `deals.reopen`, invalidates `['deal', id]` and `['deal', id, 'history']`, toasts. Reassign opens a dialog that lists users; on confirm, mutates `deals.reassign`.

- [ ] **Step 3:** `DealDetail.tsx`:

```tsx
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/useAuth";
import { endpoints } from "@/lib/api/endpoints";
import { DealForm } from "@/features/deals/DealForm";
import { DealHeader } from "@/features/deals/DealHeader";
import { StageHistoryTimeline } from "@/features/deals/StageHistoryTimeline";
import { toast } from "sonner";

export function DealDetail() {
  const { id = "" } = useParams();
  const { token = "" } = useAuth();
  const qc = useQueryClient();

  const dealQ = useQuery({
    queryKey: ["deal", id],
    queryFn: () => endpoints.deals.get(id, token),
    enabled: Boolean(id && token),
  });
  const historyQ = useQuery({
    queryKey: ["deal", id, "history"],
    queryFn: () => endpoints.deals.history(id, token),
    enabled: Boolean(id && token),
  });

  const update = useMutation({
    mutationFn: (values: any) => endpoints.deals.update(id, values, token),
    onSuccess: () => {
      toast.success("Deal updated");
      qc.invalidateQueries({ queryKey: ["deal", id] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (e: any) => toast.error(e.body?.message ?? "Update failed"),
  });

  if (dealQ.isLoading) return <p>Loading…</p>;
  if (dealQ.isError || !dealQ.data) return <p className="text-danger">Could not load deal</p>;

  return (
    <div className="space-y-6">
      <DealHeader deal={dealQ.data} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DealForm
            initial={dealQ.data}
            onSubmit={(v) => update.mutateAsync(v)}
            submitting={update.isPending}
          />
        </div>
        <div>
          <StageHistoryTimeline items={historyQ.data ?? []} loading={historyQ.isLoading} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** Manual verify: edit a deal; reopen a WON deal; reassign as admin; verify timeline updates.

- [ ] **Step 5:** Commit:

```bash
git add frontend/src/features/deals frontend/src/pages/Deals.tsx frontend/src/pages/DealDetail.tsx
git commit -m "feat(frontend): deals list, form, detail page with stage history timeline"
```

---

## Phase 14 — Pipeline (Kanban) — the interaction hotspot

Goal: drag-drop kanban with 8 columns (NEW → LOST), terminal confirmation, reopen affordance, optimistic updates with rollback.

### Task 14.1: Columns + cards (static render)

**Files:**
- Create: `frontend/src/pages/Pipeline.tsx`
- Create: `frontend/src/features/pipeline/KanbanBoard.tsx`
- Create: `frontend/src/features/pipeline/KanbanColumn.tsx`
- Create: `frontend/src/features/pipeline/KanbanCard.tsx`

- [ ] **Step 1:** `Pipeline.tsx` fetches deals list with high limit (100) and passes to `KanbanBoard`.

- [ ] **Step 2:** `KanbanColumn.tsx` — renders one stage column; header shows stage name + count. Pass `tinted` prop for WON (`bg-emerald-50 border-dashed border-emerald-200`) and LOST (`bg-rose-50 border-dashed border-rose-200`).

- [ ] **Step 3:** `KanbanCard.tsx` — compact card: client name (bold), company, `expectedValue` formatted as `QAR 12,000`, `expectedCloseDate`, `location`, `spaceType` icon. Hover shows a `Reopen` button when card is in a terminal stage.

- [ ] **Step 4:** `KanbanBoard.tsx` (static version first):

```tsx
import { DealDto, DealStage, PIPELINE_STAGES, TERMINAL_STAGES } from "@arafat/shared";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

const ALL_STAGES: DealStage[] = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

export function KanbanBoard({ deals }: { deals: DealDto[] }) {
  const byStage = ALL_STAGES.reduce<Record<DealStage, DealDto[]>>((acc, s) => {
    acc[s] = [];
    return acc;
  }, {} as any);
  for (const d of deals) byStage[d.stage].push(d);

  return (
    <div className="flex gap-3 overflow-x-auto min-h-[60vh] pb-2">
      {ALL_STAGES.map((s) => (
        <KanbanColumn key={s} stage={s}
          count={byStage[s].length} tinted={TERMINAL_STAGES.includes(s)}>
          {byStage[s].map((d) => <KanbanCard key={d.id} deal={d} />)}
        </KanbanColumn>
      ))}
    </div>
  );
}
```

- [ ] **Step 5:** Manual verify static kanban renders seeded data, including Won/Lost columns distinct. Commit.

### Task 14.2: Drag-and-drop with @dnd-kit

**Files:**
- Modify: `frontend/src/features/pipeline/KanbanBoard.tsx`
- Create: `frontend/src/features/pipeline/useStageMutation.ts`
- Create: `frontend/src/features/pipeline/ConfirmTerminalDialog.tsx`

- [ ] **Step 1:** `useStageMutation.ts` — TanStack Query mutation wrapping `endpoints.deals.stage`. On mutate, optimistically updates the `['deals']` query cache by moving the deal between stages. On error, rolls back.

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DealDto, DealStage, Paginated } from "@arafat/shared";
import { endpoints } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/useAuth";
import { toast } from "sonner";

export function useStageMutation() {
  const { token = "" } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; stage: DealStage; confirmTerminal?: boolean }) =>
      endpoints.deals.stage(v.id, { stage: v.stage, confirmTerminal: v.confirmTerminal }, token),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["deals"] });
      const prev = qc.getQueriesData<Paginated<DealDto>>({ queryKey: ["deals"] });
      qc.setQueriesData<Paginated<DealDto>>({ queryKey: ["deals"] }, (data) =>
        data ? { ...data, data: data.data.map((d) => d.id === id ? { ...d, stage } : d) } : data,
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      ctx?.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.body?.message ?? "Could not update stage");
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["deal", v.id, "history"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });
}
```

- [ ] **Step 2:** `ConfirmTerminalDialog.tsx`:

```tsx
import { Modal } from "@/components/ui/Modal";

export function ConfirmTerminalDialog({
  open, stage, onConfirm, onCancel,
}: {
  open: boolean; stage: "WON" | "LOST" | null;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open || !stage) return null;
  return (
    <Modal onClose={onCancel} title={`Move deal to ${stage}?`}>
      <p className="text-muted mb-4">
        {stage === "WON" ? "Marking as Won is final." : "Marking as Lost is final."}{" "}
        You can reopen it later if needed.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-field border border-border">Cancel</button>
        <button onClick={onConfirm}
          className={`px-4 py-2 rounded-field text-white ${stage === "WON" ? "bg-success" : "bg-danger"}`}>
          Confirm {stage}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3:** Update `KanbanBoard.tsx` to wire `@dnd-kit`:

```tsx
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import {
  DealDto, DealStage, PIPELINE_STAGES, TERMINAL_STAGES,
} from "@arafat/shared";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { useStageMutation } from "./useStageMutation";
import { ConfirmTerminalDialog } from "./ConfirmTerminalDialog";

const ALL_STAGES: DealStage[] = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

export function KanbanBoard({ deals }: { deals: DealDto[] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const mutation = useStageMutation();
  const [pendingTerminal, setPendingTerminal] = useState<{ id: string; stage: "WON" | "LOST" } | null>(null);

  const byStage = useMemo(() => {
    const acc: Record<DealStage, DealDto[]> = {} as any;
    ALL_STAGES.forEach((s) => (acc[s] = []));
    deals.forEach((d) => acc[d.stage].push(d));
    return acc;
  }, [deals]);

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const targetStage = e.over?.id as DealStage | undefined;
    if (!targetStage) return;
    const current = deals.find((d) => d.id === id);
    if (!current || current.stage === targetStage) return;
    if (TERMINAL_STAGES.includes(current.stage)) return;
    if (TERMINAL_STAGES.includes(targetStage)) {
      setPendingTerminal({ id, stage: targetStage as "WON" | "LOST" });
      return;
    }
    mutation.mutate({ id, stage: targetStage });
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto min-h-[60vh] pb-2">
          {ALL_STAGES.map((s) => (
            <KanbanColumn key={s} stage={s}
              count={byStage[s].length}
              tinted={TERMINAL_STAGES.includes(s)}>
              {byStage[s].map((d) => <KanbanCard key={d.id} deal={d} />)}
            </KanbanColumn>
          ))}
        </div>
      </DndContext>
      <ConfirmTerminalDialog
        open={!!pendingTerminal}
        stage={pendingTerminal?.stage ?? null}
        onCancel={() => setPendingTerminal(null)}
        onConfirm={() => {
          if (pendingTerminal) mutation.mutate({ ...pendingTerminal, confirmTerminal: true });
          setPendingTerminal(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4:** Make `KanbanColumn` a drop zone using `useDroppable({ id: stage })`; `KanbanCard` draggable using `useDraggable({ id: deal.id })`. Add appropriate refs and styles to show drag-over highlight.

- [ ] **Step 5:** Wire `KanbanCard`'s "Reopen" button (visible when stage ∈ terminals) to a `useMutation` that calls `endpoints.deals.reopen`. Optimistically update and invalidate `['deal', id]`, `['deal', id, 'history']`.

- [ ] **Step 6:** Manual verification checklist:
  - Drag NEW → MEETING: succeeds, no dialog, card moves.
  - Drag MEETING → WON: dialog appears; Cancel leaves card where it was; Confirm commits.
  - Drag WON card to NEGOTIATION: ignored (no drop).
  - Hover WON card → "Reopen" shows → click → card moves to NEGOTIATION, timeline shows reopen row.
  - Force a 409 by tampering (e.g., assign expired broker via deal edit, then drag): error toast and rollback.

- [ ] **Step 7:** Commit:

```bash
git add frontend/src/features/pipeline frontend/src/pages/Pipeline.tsx
git commit -m "feat(frontend): kanban pipeline with DnD, terminal confirm, reopen"
```

---

## Phase 15 — Dashboard

Goal: 5 StatCards + pipeline snapshot + recent activity. Role-scoped data.

### Task 15.1: StatCards + pipeline snapshot + activity panel

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/features/dashboard/StatCard.tsx`
- Create: `frontend/src/features/dashboard/PipelineSnapshot.tsx`
- Create: `frontend/src/features/dashboard/RecentActivity.tsx`

- [ ] **Step 1:** `StatCard.tsx`:

```tsx
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-card shadow-card p-5">
      <div className="text-muted text-xs uppercase tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="text-muted text-sm mt-1">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 2:** `PipelineSnapshot.tsx` — horizontal bars per stage, counts from the deals query; click-through navigates to `/pipeline`.

- [ ] **Step 3:** Backend mini-task — add `GET /deals/history/recent` endpoint. **TDD discipline required:** write the failing unit spec (`deals.service.spec.ts` — assert `recentHistory` returns N rows newest-first, and that SALES is scoped to `created_by`) AND the failing e2e case **before** implementing. Run the failing tests, then implement, then run them green, then commit **backend-only** before moving on to 3f. Do not bundle the backend change into the frontend commit.

  **3a.** Failing unit test in `deals.service.spec.ts`:

  ```ts
  it("recentHistory returns newest-first and scopes SALES to own", async () => {
    const rows = [{ id: "h2", changedAt: new Date("2026-04-18") }, { id: "h1", changedAt: new Date("2026-04-10") }];
    // arrange qb mock to capture the where clause and return rows
    const qb = makeQbMock(rows);
    (historyRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const res = await service.recentHistory({ id: "u1", role: "SALES", email: "x" }, 10);
    expect(res[0].id).toBe("h2");
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("created_by = :uid"),
      expect.objectContaining({ uid: "u1" }),
    );
  });

  it("recentHistory for ADMIN applies no scope", async () => {
    const qb = makeQbMock([]);
    (historyRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    await service.recentHistory({ id: "admin", role: "ADMIN", email: "x" }, 10);
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining("created_by"), expect.anything(),
    );
  });
  ```

  **3b.** `deals.service.ts` — add `recentHistory`:

  ```ts
  async recentHistory(user: AuthUser, limit = 10) {
    const qb = this.history.createQueryBuilder("h")
      .leftJoinAndSelect("h.deal", "deal")
      .leftJoinAndSelect("deal.client", "client")
      .leftJoinAndSelect("h.changedBy", "changedBy")
      .orderBy("h.changed_at", "DESC")
      .limit(Math.min(Math.max(limit, 1), 50));
    if (user.role !== "ADMIN") qb.andWhere("deal.created_by = :uid", { uid: user.id });
    return qb.getMany();
  }
  ```

  **3b.** `deals.controller.ts` — add route **above** `:id` routes so Nest doesn't match `history/recent` as an id:

  ```ts
  @Get("history/recent")
  recent(@Query("limit") limit = "10", @CurrentUser() user: AuthUser) {
    return this.svc.recentHistory(user, Number(limit));
  }
  ```

  **3c.** Add `@ApiOperation` + `@ApiQuery` for Swagger.

  **3d.** `test/deals.e2e-spec.ts` — append a case: admin sees history from both sales users; sales1 sees only their own.

  **3e.** Run `pnpm --filter @arafat/backend test:e2e` → green before proceeding.

  **3f.** Add the frontend endpoint in `frontend/src/lib/api/endpoints.ts`:

  ```ts
  // inside deals: { ... }
  recentHistory: (token: string, limit = 10) =>
    api<DealStageHistoryDto[]>(`/deals/history/recent?limit=${limit}`, { token }),
  ```

  **3g.** `RecentActivity.tsx` — renders the last 10 history rows: `{fromStage || "—"} → {toStage}` (use `StageBadge`), deal client name (clickable to `/deals/:dealId`), user name, relative time.

- [ ] **Step 4:** `Dashboard.tsx` grid:

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <StatCard label="Total Deals" value={stats.totalDeals.toString()} />
  <StatCard label="Won" value={stats.wonDeals.toString()} />
  <StatCard label="Lost" value={stats.lostDeals.toString()} />
  <StatCard label="Revenue" value={`QAR ${fmt(stats.revenueQar)}`} />
  <StatCard label="Conversion" value={`${(stats.conversionRate * 100).toFixed(1)}%`} />
</div>
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
  <PipelineSnapshot />
  <RecentActivity />
</div>
```

- [ ] **Step 5:** Manual verify as ADMIN vs SALES — numbers differ; SALES sees only their own deals. Empty states render when data is empty.

- [ ] **Step 6:** Commit:

```bash
git add backend/src/deals frontend/src/features/dashboard frontend/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): stat cards, pipeline snapshot, recent activity"
```

---

## Phase 16 — Reports page

Goal: 4-chart grid with filter bar, all role-scoped.

### Task 16.1: Reports page + charts

**Files:**
- Modify: `frontend/src/pages/Reports.tsx`
- Create: `frontend/src/features/reports/ReportChartCard.tsx`
- Create: `frontend/src/features/reports/WinLossChart.tsx`
- Create: `frontend/src/features/reports/ByLocationChart.tsx`
- Create: `frontend/src/features/reports/BySourceChart.tsx`
- Create: `frontend/src/features/reports/RevenueTimeseriesChart.tsx`
- Create: `frontend/src/features/reports/ReportFilterBar.tsx`

- [ ] **Step 1:** `ReportChartCard.tsx`:

```tsx
export function ReportChartCard({
  title, summary, children,
}: { title: string; summary?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        {summary && <span className="text-muted text-sm">{summary}</span>}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2:** `WinLossChart.tsx` — Recharts `PieChart` (donut) with Won (success), Lost (danger), Open (muted).

- [ ] **Step 3:** `ByLocationChart.tsx` — Recharts `BarChart` horizontal; one bar per location with label and QAR value.

- [ ] **Step 4:** `BySourceChart.tsx` — same pattern, bars per source.

- [ ] **Step 5:** `RevenueTimeseriesChart.tsx` — Recharts `LineChart` with date axis, revenue axis. Use `date-fns/format(new Date(bucket), 'MMM yy')` for tick labels.

- [ ] **Step 6:** `ReportFilterBar.tsx` — date range inputs + location/broker/source selects. Propagates state up via callback or URL params.

- [ ] **Step 7:** `Reports.tsx`:

```tsx
const [filters, setFilters] = useState({ from: defaultFromIso, to: todayIso, location: "", brokerId: "" });
// 4 useQuery calls for each endpoint, keyed on filters
return (
  <>
    <ReportFilterBar filters={filters} onChange={setFilters} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <ReportChartCard title="Win vs Lost"><WinLossChart data={winLossQ.data} /></ReportChartCard>
      <ReportChartCard title="Revenue over time"><RevenueTimeseriesChart data={tsQ.data} /></ReportChartCard>
      <ReportChartCard title="By location"><ByLocationChart data={byLocQ.data} /></ReportChartCard>
      <ReportChartCard title="By source"><BySourceChart data={bySrcQ.data} /></ReportChartCard>
    </div>
  </>
);
```

- [ ] **Step 8:** Manual verify with seed: donut shows ~4 won / ~2 lost; revenue line shows 4 months with values; location/source bars populated.

- [ ] **Step 9:** Commit:

```bash
git add frontend/src/features/reports frontend/src/pages/Reports.tsx
git commit -m "feat(frontend): reports page with 4 charts and filter bar"
```

---

## Phase 17 — Users admin page

Goal: ADMIN CRUD for users with self-delete protection.

### Task 17.1: Users page

**Files:**
- Modify: `frontend/src/pages/Users.tsx`
- Create: `frontend/src/features/users/UserForm.tsx`
- Create: `frontend/src/features/users/userSchema.ts`

- [ ] **Step 1:** `userSchema.ts`:

```ts
import { z } from "zod";
import { Role } from "@arafat/shared";
export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});
export const updateUserSchema = createUserSchema.partial();
```

- [ ] **Step 2:** `UserForm.tsx` — same pattern as `ClientForm`. Edit mode hides password field (or makes it optional "leave blank to keep current").

- [ ] **Step 3:** `Users.tsx`:
  - DataTable columns: Name, Email, Role (Badge), Created.
  - "New User" button → modal.
  - Row click → edit modal.
  - Delete icon on each row; cannot appear on the current user's row.
  - On 409 `CANNOT_DELETE_SELF` (belt-and-braces in case UI gate bypassed), toast error.

- [ ] **Step 4:** Manual verify as ADMIN (create, edit, delete another user). Ensure SALES can't reach `/users` (Phase 9 ProtectedRoute).

- [ ] **Step 5:** Commit:

```bash
git add frontend/src/features/users frontend/src/pages/Users.tsx
git commit -m "feat(frontend): users admin page with self-delete guard"
```

---

## Phase 18 — Dockerize, README, final smoke test

Goal: `docker compose up` from a clean clone → fully working app at `http://localhost:<FRONTEND_PORT>` with seeded data.

### Task 18.1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `backend/docker-entrypoint.sh`

- [ ] **Step 1:** `backend/.dockerignore`:

```
node_modules
dist
test
coverage
.env
```

- [ ] **Step 2:** `backend/Dockerfile` — multi-stage. **Migrations are compiled to JS** so the runtime image does not need ts-node:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY backend backend
# nest build + compile data-source + migrations to JS
RUN pnpm --filter @arafat/backend build \
 && pnpm --filter @arafat/backend exec tsc \
      --project tsconfig.build.json \
      --rootDir . \
      --outDir dist-migrations \
      data-source.ts migrations/*.ts

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/dist-migrations backend/dist-migrations
COPY backend/package.json backend/
COPY backend/seed backend/seed
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
WORKDIR /app/backend
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
```

Also update `backend/package.json` to expose a JS-based migration runner used only inside the container:

```json
"migration:run:prod": "typeorm -d dist-migrations/data-source.js migration:run"
```

- [ ] **Step 3:** `backend/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e
# Working dir is /app/backend. The `typeorm` binary that `migration:run:prod`
# invokes lives in /app/node_modules/.bin (pnpm hoists workspace deps to the
# repo root). pnpm's resolver walks up the tree, so calling `pnpm exec` here
# resolves correctly — but do NOT rewrite this as a bare `typeorm ...` call
# without first adding `/app/node_modules/.bin` to PATH or prefixing the
# full binary path.
echo "Running migrations..."
pnpm migration:run:prod
if [ "$RUN_SEED" = "true" ]; then
  echo "Running seed..."
  node -r ts-node/register seed/seed.js 2>/dev/null || pnpm seed || echo "Seed skipped"
fi
exec "$@"
```

- [ ] **Step 4:** Commit.

### Task 18.2: Frontend Dockerfile + nginx config

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`

- [ ] **Step 1:** `frontend/Dockerfile`. `pnpm install --frozen-lockfile` refuses to run unless **every** workspace package's `package.json` is present, so we copy all three manifests before the install, not just the frontend's:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY packages/shared packages/shared
COPY frontend frontend
RUN pnpm --filter @arafat/frontend build

FROM nginx:alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 2:** `frontend/nginx.conf`:

```
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

- [ ] **Step 3:** Commit.

### Task 18.3: Full docker-compose with backend + frontend

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1:** Extend to three services:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-arafat}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-arafat}
      POSTGRES_DB: ${POSTGRES_DB:-arafat_crm}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-arafat}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://${POSTGRES_USER:-arafat}:${POSTGRES_PASSWORD:-arafat}@postgres:5432/${POSTGRES_DB:-arafat_crm}
      JWT_SECRET: ${JWT_SECRET:-change-me}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      CORS_ORIGIN: http://localhost:${FRONTEND_PORT:-5173}
      BACKEND_PORT: 3000
      RUN_SEED: "true"
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        VITE_API_URL: http://localhost:${BACKEND_PORT:-3000}
    ports:
      - "${FRONTEND_PORT:-5173}:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

- [ ] **Step 2:** Commit.

### Task 18.4: README

**Files:**
- Create: `README.md`

- [ ] **Step 1:** Contents:

```markdown
# ArafatCRM

Sales CRM for Arafat Business Center — rentals of Workstations and Offices across three Qatar locations.

## Stack
NestJS · TypeORM · PostgreSQL 15 · React 18 · Vite · Tailwind (TailAdmin Pro base) · pnpm workspaces · Docker.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3000
- Swagger:  http://localhost:3000/api/docs

Demo logins (seeded automatically on first run):

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| ADMIN  | admin@arafat.qa     | Admin@123 |
| SALES  | sales1@arafat.qa    | Sales@123 |
| SALES  | sales2@arafat.qa    | Sales@123 |

## Local development (without Docker for the apps)

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @arafat/backend migration:run
pnpm --filter @arafat/backend seed
pnpm dev
```

## Test

```bash
pnpm --filter @arafat/backend test
pnpm --filter @arafat/backend test:e2e
```

## Architecture overview

- `packages/shared` — TypeScript enums + DTOs used by both apps.
- `backend/` — NestJS REST API, TypeORM migrations, Swagger at `/api/docs`.
- `frontend/` — React/Vite SPA served by nginx in production.

See `docs/superpowers/specs/2026-04-19-arafatcrm-design.md` for the full design document.

## Environment variables

See `.env.example` at the repo root and per-app `.env.example` files.
```

- [ ] **Step 2:** Commit.

### Task 18.5: Final smoke test

**Checklist (all must pass):**

- [ ] **Step 1:** `docker compose down -v && docker compose up --build`. Wait for backend log `Backend listening on :3000`.
- [ ] **Step 2:** Visit `http://localhost:5173` → login as admin → dashboard renders with non-zero numbers.
- [ ] **Step 3:** Visit `/pipeline` → 8 columns, seeded cards visible.
- [ ] **Step 4:** Drag a card from QUALIFIED to MEETING → persists on refresh. Check `GET /deals/<id>/history` via Swagger.
- [ ] **Step 5:** Drag into WON → confirm dialog appears → confirm → card lands in Won lane.
- [ ] **Step 6:** Attempt to delete a client with deals → toast "This client has N deals …".
- [ ] **Step 7:** Sign out, sign in as sales1 → `/pipeline` shows only sales1's deals; dashboard numbers smaller.
- [ ] **Step 8:** Swagger `/api/docs` lists every endpoint and schemas match actual responses.
- [ ] **Step 9:** `pnpm --filter @arafat/backend test && pnpm --filter @arafat/backend test:e2e` → all green.
- [ ] **Step 10:** Commit any doc tweaks.

```bash
git add README.md
git commit -m "docs: add README with quick start, demo credentials, architecture overview"
```

### Task 18.6: Tag the milestone

- [ ] **Step 1:** `git tag -a v0.1.0 -m "ArafatCRM v0.1.0 — first working release"`.

---

## Appendix A — Skills to reference during execution

- @superpowers:test-driven-development — when implementing a service method, write the spec first, run it fail, implement, run it pass, commit. Applies to every backend service task in Phases 3–8.
- @superpowers:systematic-debugging — when a test or smoke fails, reproduce the minimal case, bisect, fix; never paper over with `--no-verify`.
- @superpowers:verification-before-completion — do not claim a task "done" until its verification step passes.
- @superpowers:subagent-driven-development — primary execution harness for this plan. Fresh subagent per task + two-stage review.

## Appendix B — Task ordering notes for subagent dispatch

Phases 0–2 must be strictly sequential (they set up shared tooling). Within Phases 3–8, modules can be built in parallel where entities don't cross-reference yet — but `deals` depends on `clients`, `brokers`, `users`. Recommended serial order: 3 → 4 → 5 → 6 → 7 → 8 on the backend; then 9 → 10 on the frontend (scaffold before any page); then 11–17 can run mostly in parallel once 10 is done, with the caveat that the pipeline page (14) depends on the deal form from 13.2. Phase 18 runs last.

