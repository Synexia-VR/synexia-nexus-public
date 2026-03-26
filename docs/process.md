# Synexia Nexus — Project State Snapshot

**Last updated:** 2026-03-07  
**Canonical repo:** private (Synexia)  
**Public mirror:** sanitized (synexia-nexus-public)

## What this project is
Synexia Nexus is a modular monolith SaaS for esports organization/team management:
- organizations, roles, memberships
- teams, rosters, players
- events, matches, match stats
- aggregated stats + MMR

## Tech stack
- Backend: Node.js 20 + TypeScript + Express + Prisma + PostgreSQL
- Frontend: React 18 + TypeScript + Vite + React Router

## Auth & sessions (current behavior)
- Access token: JWT (HMAC), ~15 minutes, returned in JSON.
- Refresh token: HttpOnly cookie, rotated, stored hashed in DB.
- Refresh endpoint: `POST /api/auth/refresh` (cookie-based).
- Protected API endpoints require `Authorization: Bearer <accessToken>`.

Notes:
- Refresh cookie is scoped to auth routes (cookie path), so cookie alone is not sufficient for non-auth endpoints.
- Use refresh (POST) to obtain a fresh access token when needed.

## Multi-tenancy & RBAC
- Users can belong to multiple organizations with roles.
- Org membership is enforced on org-scoped endpoints.
- Security hardening added org-membership checks on multiple read endpoints:
  - `/api/teams/:teamId/events`
  - `/api/teams/:teamId/matches`
  - `/api/events` (requires `organizationId`)
  - `/api/matches` (requires `organizationId`)
  - `/api/players/:playerId/mmr`

## CI & branch rules
- Workflow: `CI`
- Required checks: `Backend`, `Frontend`
- Main is protected (merge via PR + required checks + required team review rules if enabled).

## Smoke tests
- `scripts/smoke/rbac-smoke-test.sh`
  - Baseline: health + refresh + sessions
  - RBAC: validates org isolation for key read endpoints
  - Supports `--setup` in empty environments (optional)

## How we work (process)
- GitHub is the single source of truth (Issues + Projects + PRs).
- PR body must include `Closes #<issueId>`.
- Replit is used for implementation/iteration when needed.
  - Branch creation is controlled by the Tech Lead prompt.
  - The human maintainer runs QA, pushes, opens PRs, and merges.

## Current focus
- Team Overview UI in Stats page (backend endpoint exists; UI work pending or needs verification).
- Frontend maintainability: extract inline pages from `frontend/src/main.tsx` into `frontend/src/pages/`.

## Next priorities (short list)
1) Team Overview UI (cards + match summary table)
2) Extract StatsPage (and other inline pages) into separate files
3) Stats v1 pack (extend ShooterMatchStat + migrations + editor + validations)
4) Rivals model v1
