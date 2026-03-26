# Architecture

## Overview
Synexia Nexus is a modular monolith:
- A single backend service (Express) with module boundaries.
- A single frontend SPA (React) consuming the API.

## Backend modules
- `auth`: login/register, refresh tokens, sessions, logout
- `me`: current user org memberships + session management
- `core`: organizations and platform modules
- `nexus-teams`: games, teams, rosters, players, events, matches, stats, mmr

## Data access
- Prisma is the ORM.
- PostgreSQL is the database.
- Multi-tenancy is enforced by organizationId scoping and membership checks.

## Key design decisions
- Access token in memory on frontend (no localStorage).
- Refresh token stored as HttpOnly cookie and rotated.
- RBAC enforced on backend; frontend hides/disables UI actions based on role.

## Observability
- Request ID per request (x-request-id)
- Structured logging (pino)
- Sensitive headers redacted
