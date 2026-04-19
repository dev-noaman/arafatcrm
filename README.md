# ArafatCRM

A modern CRM system built with NestJS backend and React frontend, designed for managing clients, brokers, and deals in a real estate context.

## Tech Stack

**Backend:**
- NestJS 10 with TypeScript
- TypeORM with PostgreSQL
- JWT authentication with Passport
- Swagger/OpenAPI documentation
- bcrypt for password hashing

**Frontend:**
- React 18 with TypeScript
- Vite for bundling
- TailwindCSS for styling
- React Query for data fetching
- Zustand for state management
- React Router for navigation

**Shared:**
- pnpm workspaces monorepo
- Shared TypeScript types/enums in `packages/shared`

## Project Structure

```
arafatcrm/
├── backend/              # NestJS backend
│   ├── src/
│   │   ├── auth/        # Authentication module
│   │   ├── users/       # Users module
│   │   ├── clients/     # Clients module
│   │   ├── brokers/     # Brokers module
│   │   ├── deals/       # Deals module
│   │   ├── dashboard/   # Dashboard statistics
│   │   ├── reports/     # Reports and analytics
│   │   ├── common/      # Guards, decorators, filters
│   │   ├── db/          # Migrations and seeds
│   │   └── main.ts
│   ├── .env.example
│   └── Dockerfile
├── frontend/             # React frontend
│   ├── src/
│   │   ├── api/         # API client wrappers
│   │   ├── contexts/    # React contexts and stores
│   │   ├── hooks/       # Custom React hooks
│   │   ├── layouts/     # Page layouts
│   │   ├── lib/         # Utilities
│   │   ├── pages/       # Page components
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx
│   └── .env.example
├── packages/
│   └── shared/          # Shared types and enums
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose (for database)

### 1. Clone and Install

```bash
cd arafatcrm
pnpm install
```

### 2. Setup Environment

```bash
# Root
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start Database

```bash
docker-compose up -d db
```

Wait for PostgreSQL to be healthy (about 5-10 seconds).

### 4. Run Migrations

```bash
pnpm --filter backend migration:run
```

### 5. Seed Demo Data

```bash
pnpm --filter backend seed:run
```

This creates:
- 2 users (admin and sales)
- 10 clients
- 5 brokers
- 15 deals

### 6. Start Development Servers

```bash
# Terminal 1 - Backend
pnpm --filter backend dev

# Terminal 2 - Frontend
pnpm --filter frontend dev
```

- Backend: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- Frontend: http://localhost:5173

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@arafatcrm.com | password123 | admin |
| sales@arafatcrm.com | password123 | sales |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Users (Admin only)
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user
- `DELETE /api/v1/users/:id` - Delete user

### Clients
- `GET /api/v1/clients` - List clients (paginated)
- `GET /api/v1/clients/:id` - Get client
- `POST /api/v1/clients` - Create client
- `PUT /api/v1/clients/:id` - Update client
- `DELETE /api/v1/clients/:id` - Delete client

### Brokers
- `GET /api/v1/brokers` - List brokers (paginated)
- `GET /api/v1/brokers/:id` - Get broker
- `POST /api/v1/brokers` - Create broker
- `PUT /api/v1/brokers/:id` - Update broker
- `DELETE /api/v1/brokers/:id` - Delete broker

### Deals
- `GET /api/v1/deals` - List deals (paginated, filterable)
- `GET /api/v1/deals/:id` - Get deal
- `POST /api/v1/deals` - Create deal
- `PUT /api/v1/deals/:id` - Update deal
- `POST /api/v1/deals/:id/mark-lost` - Mark deal as lost
- `DELETE /api/v1/deals/:id` - Delete deal
- `GET /api/v1/deals/client/:id` - Find deals by client
- `GET /api/v1/deals/broker/:id` - Find deals by broker
- `GET /api/v1/deals/owner/:id` - Find deals by owner

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/dashboard/revenue-timeseries` - Revenue over time
- `GET /api/v1/dashboard/by-location` - Deals by location
- `GET /api/v1/dashboard/by-source` - Deals by client source

### Reports
- `GET /api/v1/reports/win-loss` - Win/loss report by user
- `GET /api/v1/reports/pipeline` - Deal pipeline by stage
- `GET /api/v1/reports/broker-performance` - Broker performance

## Available Scripts

### Root
```bash
pnpm dev          # Start all services (backend + frontend)
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm test:e2e     # Run e2e tests
```

### Backend
```bash
pnpm --filter backend dev           # Start dev server
pnpm --filter backend build         # Build for production
pnpm --filter backend start         # Start production server
pnpm --filter backend lint          # Run ESLint
pnpm --filter backend test          # Run unit tests
pnpm --filter backend test:e2e      # Run e2e tests
pnpm --filter backend migration:run     # Run migrations
pnpm --filter backend migration:generate  # Generate migration
pnpm --filter backend migration:revert    # Revert last migration
pnpm --filter backend seed:run      # Run seed script
```

### Frontend
```bash
pnpm --filter frontend dev      # Start dev server
pnpm --filter frontend build    # Build for production
pnpm --filter frontend preview  # Preview production build
pnpm --filter frontend lint     # Run ESLint
```

## Docker

### Start all services:
```bash
docker-compose up -d
```

### View logs:
```bash
docker-compose logs -f
```

### Stop all services:
```bash
docker-compose down
```

## Testing

### Backend Unit Tests
```bash
pnpm --filter backend test
```

### Backend E2E Tests
```bash
pnpm --filter backend test:e2e
```

Requires running PostgreSQL. Set `DATABASE_URL` in `.env`.

## License

Private - All rights reserved
