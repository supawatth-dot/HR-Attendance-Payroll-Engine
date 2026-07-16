# HR Attendance & Payroll Engine

[![CI Pipeline](https://github.com/your-org/hr-payroll-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/hr-payroll-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)

A **production-ready, metadata-driven HR platform** for managing employee attendance, leave, and payroll. Business rules (overtime rates, allowances, deductions) are stored as versioned database records — policy changes take effect without redeployments.

---

## ✨ Features

- 🔐 **JWT Authentication** with Role-Based Access Control (RBAC)
- 👥 **Employee & Department Management** — full lifecycle CRUD
- 🕐 **Flexible Shift Definitions** with assignment workflows
- 📅 **Public Holiday Calendar** supporting recurring entries
- 🌴 **Leave Management** — submit, approve, reject with audit trail
- ⏱️ **Attendance Tracking** — real-time check-in/out with manual correction
- 📂 **Bulk Import** — CSV/Excel uploads processed asynchronously via BullMQ
- 🧮 **Metadata-Driven Rule Engine** — versioned rules for OT, allowances, deductions
- 💰 **Payroll Calculation** — automated monthly runs with PDF payslips
- 📋 **Immutable Audit Logs** — before/after diffs for every data change
- ⚙️ **Company Settings** — configurable working hours, pay cycle, fiscal year
- 🐳 **Docker Compose** — one-command local environment

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js + React | 14.x |
| **Backend** | NestJS (Node.js) | 10.x |
| **Language** | TypeScript | 5.x |
| **ORM** | Prisma | 5.x |
| **Database** | PostgreSQL | 16 |
| **Cache / Queues** | Redis + BullMQ | 7 / 4.x |
| **Auth** | JWT + Passport | — |
| **Containers** | Docker + Compose | 27.x |
| **CI/CD** | GitHub Actions | — |

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 27
- [Node.js](https://nodejs.org) ≥ 20 (for local development without Docker)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/hr-payroll-engine.git
cd hr-payroll-engine

# Copy environment template and fill in secrets
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_64_char_random_secret
```

### 2. Start all services

```bash
docker compose up -d
```

This starts:
| Service | URL |
|---|---|
| **Frontend** | http://localhost:3001 |
| **Backend API** | http://localhost:3000/api/v1 |
| **PostgreSQL** | localhost:5432 |
| **Redis** | localhost:6379 |

### 3. Run database migrations (first time only)

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed   # optional seed data
```

### 4. Verify health

```bash
curl http://localhost:3000/health
# → { "status": "ok", "database": "up", "redis": "up" }
```

---

## 📁 Folder Structure

```
hr-payroll-engine/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── backend/
│   ├── src/
│   │   ├── app.module.ts       # NestJS root module
│   │   ├── main.ts             # Application bootstrap
│   │   ├── auth/               # JWT auth, guards, decorators
│   │   ├── employees/          # Employee CRUD
│   │   ├── departments/        # Department management
│   │   ├── shifts/             # Shift definitions
│   │   ├── holidays/           # Holiday calendar
│   │   ├── leaves/             # Leave requests & approvals
│   │   ├── attendance/         # Check-in/out + results
│   │   ├── import/             # Bulk CSV/Excel import
│   │   ├── rules/              # Metadata-driven rule engine
│   │   ├── payroll/            # Payroll calculation & payslips
│   │   ├── audit/              # Audit log
│   │   ├── company-settings/   # Company configuration
│   │   └── prisma/             # Prisma service module
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── test/                   # e2e tests
│   ├── Dockerfile              # Multi-stage backend image
│   └── package.json
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable UI components
│   ├── lib/                    # API client, utils
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Multi-stage frontend image
│   └── package.json
├── docs/
│   ├── architecture.md         # System architecture + diagrams
│   └── api-spec.md             # Full API reference
├── docker-compose.yml          # Local orchestration
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Full PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing JWT tokens (≥ 64 chars) |
| `JWT_EXPIRES_IN` | ✅ | `7d` | JWT token lifespan |
| `REDIS_URL` | ✅ | — | Redis connection URL |
| `PORT` | ✅ | `3000` | Backend server port |
| `FRONTEND_PORT` | ✅ | `3001` | Frontend server port |
| `NEXT_PUBLIC_API_URL` | ✅ | — | Public API base URL consumed by frontend |
| `POSTGRES_PASSWORD` | ✅ | — | PostgreSQL password (used by Docker Compose) |
| `POSTGRES_USER` | ❌ | `postgres` | PostgreSQL username |
| `POSTGRES_DB` | ❌ | `hr_payroll` | PostgreSQL database name |

See [`.env.example`](.env.example) for full documentation.

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│            Next.js Frontend (3001)           │
└─────────────────────┬───────────────────────┘
                      │ HTTP / REST
┌─────────────────────▼───────────────────────┐
│           NestJS API Backend (3000)          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │Auth/RBAC │  │  Domain  │  │  BullMQ   │  │
│  │  Guards  │  │ Services │  │  Workers  │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────┬─────────────────────────┬─────────┘
           │ Prisma ORM              │ BullMQ
┌──────────▼──────┐       ┌──────────▼──────────┐
│  PostgreSQL 16  │       │      Redis 7         │
│  (Primary DB)   │       │  (Cache + Queues)    │
└─────────────────┘       └──────────────────────┘
```

See [`docs/architecture.md`](docs/architecture.md) for detailed diagrams and the Rule Engine deep-dive.

---

## 🧪 Running Tests

```bash
# Run backend tests with coverage
cd backend
npm ci
npm test -- --coverage

# Run e2e tests (requires running Postgres + Redis)
npm run test:e2e
```

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a **Pull Request** against `main`

Please ensure all tests pass and coverage does not decrease before submitting a PR.

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

> Built with ❤️ by the HR Platform Team
