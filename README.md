# Orbis — Political Management Platform
**by Velthor Technologies**

A scalable, modular web platform for political management, coordination, and intelligence.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Realtime | Socket.io |
| Auth | JWT (access + refresh tokens) |
| Maps | OpenStreetMap + React Leaflet |
| Charts | Recharts |

---

## Project Structure

```
orbis-velthor/
├── backend/                  # Express API
│   ├── src/
│   │   ├── app.js            # Entry point
│   │   ├── config/           # DB, Socket.io, migrations
│   │   ├── middleware/       # Auth, RBAC, upload, logger
│   │   ├── modules/
│   │   │   ├── auth/         # JWT login/logout/refresh
│   │   │   ├── users/        # User CRUD + RBAC
│   │   │   ├── areas/        # Area management
│   │   │   ├── documents/    # File upload + versioning
│   │   │   ├── legislative/  # Expedientes + chat + timeline
│   │   │   ├── chat/         # Real-time channels
│   │   │   ├── surveys/      # Survey builder + analytics
│   │   │   ├── territories/  # Map pins + territories
│   │   │   ├── dashboard/    # Stats + alerts
│   │   │   └── intelligence/ # Audit logs + exports (Owner/Admin only)
│   │   └── utils/
│   └── package.json
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── api/              # Axios API client + endpoints
│   │   ├── components/       # Layout, UI components
│   │   ├── pages/            # All page views
│   │   └── store/            # Zustand auth store
│   └── package.json
└── database/
    └── schema.sql            # Full PostgreSQL schema
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## Setup Instructions

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure PostgreSQL

```sql
CREATE USER orbis_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE orbis_db OWNER orbis_user;
GRANT ALL PRIVILEGES ON DATABASE orbis_db TO orbis_user;
```

### 3. Configure backend environment

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and JWT secrets
```

### 4. Run database migration

```bash
cd backend
npm run db:migrate
```

Creates default owner: **owner@orbis.local** / **Admin@Orbis2024!**

> ⚠️ Change the default password immediately after first login.

### 5. Start the servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev   # http://localhost:4000

# Terminal 2 — Frontend
cd frontend && npm run dev  # http://localhost:5173
```

---

## User Roles

| Role | Description |
|------|-------------|
| `owner` | Full system access |
| `super_admin` | System-wide admin |
| `political_coordinator` | Create areas, expedientes, surveys |
| `area_manager` | Manage assigned areas |
| `legislator` | Create/manage expedientes |
| `basic_user` | Read access to assigned areas |

---

## Modules

| Module | Path | Description |
|--------|------|-------------|
| Dashboard | `/` | Stats, alerts, trend charts |
| Areas | `/areas` | Organizational structure |
| Documents | `/documents` | File management with versioning |
| Legislative | `/legislative` | Expedientes workflow + chat |
| Chat | `/chat` | Real-time team messaging |
| Surveys | `/surveys` | Builder + public links + analytics |
| Map | `/map` | Territory pins + filtering |
| Intelligence | `/intelligence` | Owner/Admin audit + exports |
| Users | `/users` | User management + RBAC |

---

## API

All endpoints: `http://localhost:4000/api/*`  
Health check: `GET /health`

---

*Orbis — Velthor Technologies*
