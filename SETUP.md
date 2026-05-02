# Orbis — Setup & Run Guide

## Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)
- npm

---

## Quick Start (Local Dev)

### 1. Database
```bash
# Option A: Docker (recommended)
docker run -d \
  --name orbis_postgres \
  -e POSTGRES_USER=orbis \
  -e POSTGRES_PASSWORD=orbis_password \
  -e POSTGRES_DB=orbis_db \
  -p 5432:5432 \
  postgres:16-alpine

# Option B: Local PostgreSQL
createdb orbis_db
```

### 2. Backend
```bash
cd server
npm install

# Copy env
cp .env.example .env
# Edit .env if your DB settings differ

# Push schema & seed
npx prisma db push
node prisma/seed.js

# Start dev server
npm run dev
# → Server on http://localhost:4000
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
# → App on http://localhost:5173
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@orbis.com | admin123 |
| Super Admin | admin@orbis.com | admin123 |
| Coordinator | coord@orbis.com | coord123 |

---

## Full Docker Compose

```bash
docker compose up --build
# App: http://localhost:5173
# API: http://localhost:4000
```

---

## Architecture

```
orbis-velthor/
├── server/                   # Node.js + Express API
│   ├── src/
│   │   ├── modules/          # Feature modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── areas/
│   │   │   ├── documents/
│   │   │   ├── legislative/
│   │   │   ├── chat/
│   │   │   ├── surveys/
│   │   │   ├── territories/
│   │   │   ├── dashboard/
│   │   │   ├── intelligence/
│   │   │   └── coordinators/
│   │   ├── middleware/        # Auth, logging, errors
│   │   └── config/           # DB, logger
│   └── prisma/               # Schema + seed
└── client/                   # React + Vite + Tailwind
    └── src/
        ├── pages/             # One folder per module
        ├── components/        # Shared UI + layout
        ├── services/          # API client + Socket.io
        └── context/           # Auth context
```

---

## API Endpoints

| Module | Base Path |
|--------|-----------|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Areas | `/api/areas` |
| Documents | `/api/documents` |
| Legislative | `/api/legislative` |
| Chat | `/api/chat` |
| Surveys | `/api/surveys` |
| Territories | `/api/territories` |
| Dashboard | `/api/dashboard` |
| Intelligence | `/api/intelligence` |
| Coordinators | `/api/coordinators` |

---

## RBAC Roles (highest → lowest)

1. **OWNER** — full system control
2. **SUPER_ADMIN** — manage users, access intelligence module
3. **POLITICAL_COORDINATOR** — create areas, manage coordinators
4. **AREA_MANAGER** — manage users in areas, create surveys/pins
5. **LEGISLATOR** — create & update expedientes
6. **BASIC_USER** — read-only access

---

*Orbis v1.0.0 — Velthor Technologies*
