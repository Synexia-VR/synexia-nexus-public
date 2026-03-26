# Synexia Nexus

Synexia Nexus is a modular monolith SaaS for esports organization/team management (organizations, teams, players, events, matches, stats).

> Documentation lives in `/docs` (start with `docs/PROJECT_STATE.md`).

---

## What’s inside

- **Backend:** Node.js 20 + TypeScript + Express + Prisma
- **Frontend:** React 18 + TypeScript + Vite + React Router
- **Database:** PostgreSQL

Backend modules:
- `core` (organizations, modules)
- `auth` (JWT + refresh tokens, sessions)
- `me` (user orgs + session management)
- `nexus-teams` (teams, rosters, players, events, matches, stats, mmr)

---

## Repository structure

- backend/ Express API + Prisma schema/migrations
- frontend/ React app (Vite)
- docs/ Canonical technical docs (public-safe)
- scripts/smoke/ Smoke tests (baseline + RBAC)
- docs/internal/ (private repo only, excluded from public mirror)

---

## Quickstart (local)

### Prerequisites
- Node.js **20+**
- PostgreSQL
- npm

### 1) Install dependencies
`
bash
cd backend
npm install
cd ../frontend
npm install
`

---

## 2) Configure environment

Backend requires at minimum:

- DATABASE_URL
- JWT_SECRET
- PORT (default 3000)
- CORS_ORIGIN (frontend origin)
- Create backend/.env (example):

# DATABASE_URL="postgresql://user:pass@localhost:5432/synexia"
# JWT_SECRET="dev-secret-change-me"
# PORT=3000
# CORS_ORIGIN="http://localhost:5173"
# NODE_ENV=development

Do not commit .env files.

## 3) Run migrations
`
cd backend
npx prisma migrate dev
`

## 4) Run dev servers

- Backend:

`
cd backend
npm run dev
`

- Frontend:

`
cd frontend
npm run dev
`

### Authentication & sessions (important)

## Access token vs Refresh token

- Access token: JWT returned as accessToken in JSON (short-lived, ~15 minutes).

- Refresh token: HttpOnly cookie (rotated) used only via auth endpoints.

## Protected endpoints require Bearer token

Most protected endpoints require:

- Authorization: Bearer <accessToken>

Example:

`
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/me/organizations
`

- Refresh endpoint is POST (not GET)
# Login and store cookie
`
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Password123!"}' \
  http://localhost:3000/api/auth/login
`
# Refresh (POST)
`curl -X POST -b cookies.txt http://localhost:3000/api/auth/refresh`

### Multi-tenancy & RBAC notes

- Users can belong to multiple organizations with roles.

- Org membership is enforced on org-scoped endpoints.

Important:

- GET /api/events requires organizationId query param

- GET /api/matches requires organizationId query param

### Smoke tests (recommended)

- RBAC + baseline smoke test:

`
chmod +x scripts/smoke/rbac-smoke-test.sh
./scripts/smoke/rbac-smoke-test.sh
`
- Optional setup in empty environments:

./scripts/smoke/rbac-smoke-test.sh --setup
`

### CI & workflow

- CI workflow: CI

Required checks: Backend, Frontend

Work happens via Issues → Branch → PR → Merge.

PR body must include: Closes #<issueId>.

Contributing (internal workflow)
