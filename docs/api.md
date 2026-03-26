# Security

## Authentication model
- Access token: JWT (HMAC), short-lived (~15 minutes).
- Refresh token: random 64 bytes, hashed in DB, rotated on refresh.
- Refresh token stored in HttpOnly cookie (rotated).

### Refresh endpoint
- `POST /api/auth/refresh` (cookie-based)
- Returns `{ accessToken, user }`

### Calling protected endpoints
All protected endpoints require:
- `Authorization: Bearer <accessToken>`

## Sessions
- Sessions are refresh tokens stored in DB.
- `GET /api/me/sessions` lists active sessions.
- `POST /api/me/sessions/:sessionId/revoke` revokes one session.
- `POST /api/auth/logout-all` revokes all sessions for the user.

## Multi-tenancy & RBAC
- Membership stored in `UserOrganizationMembership` with `OrganizationRole`.
- Rules:
  - org-scoped reads must verify membership
  - org-scoped mutations must verify permissions

### Read hardening
Org membership is enforced on key read endpoints:
- team events/matches by teamId (team lookup -> org lookup -> membership check)
- org lists of events/matches require `organizationId` query param and enforce membership
- player MMR endpoint enforces membership by player.organizationId

## Rate limiting
- login/register/refresh limiters
- mutation limiter for POST/PATCH/DELETE

## Validation & error handling
- Zod validation for critical endpoints (extend over time)
- Standard error format includes requestId
