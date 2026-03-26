# RBAC and Identity Architecture

## 1. Overview

Synexia Nexus implements a multi-layered role-based access control (RBAC) system to support its multi-tenant SaaS architecture. The system distinguishes between:

- **Platform-level roles**: Control who can administer the SaaS platform itself (global configuration, managing organizations, etc.).
- **Organization-level roles**: Control what a user can do within a specific club, team, or league they belong to.
- **Public/community roles** (future): Enable fan engagement and public viewing of curated content.

This separation ensures that:
1. Platform administrators can manage the entire SaaS without being tied to any single organization.
2. Users can have different roles in different organizations (e.g., owner of one club, analyst for another).
3. Future community features can coexist with internal staff tools without compromising sensitive data.

---

## 2. Platform-level RBAC

Platform roles govern access to SaaS-wide administrative functions. These roles are stored at the `User` level (e.g., a `platformRole` field or a dedicated relation).

### 2.1 Platform Roles

| Role | Description |
|------|-------------|
| `platform_owner` | Ultimate owner of the SaaS. Full access to all platform-level operations, including billing, infrastructure settings, and super-admin capabilities. |
| `platform_admin` | Manages organizations, modules, integrations, and global configuration. Cannot modify billing or infrastructure-level settings. |
| `platform_support` | Support/staff role for troubleshooting. Can view data across organizations for support purposes but with limited destructive actions. |
| `league_admin` *(future)* | Manages leagues and tournaments at the platform level, coordinating across multiple organizations. |
| `tournament_admin` *(future)* | Similar to league_admin but scoped to specific tournament operations. |

### 2.2 Implementation Notes

- Platform roles gate access to `/api/admin/*` endpoints.
- A future `/admin` UI will provide a dashboard for platform-level operations.
- Most regular users will have no platform role (or a `null`/`none` value), meaning they can only interact with organizations they are members of.

---

## 3. Organization-level RBAC

Within each organization (club, team, league), users are assigned roles via a membership table:

```
UserOrganizationMembership {
  userId: string
  organizationId: string
  role: OrganizationRole
  joinedAt: DateTime
}
```

A single user can belong to multiple organizations with different roles in each.

### 3.1 Organization Roles

| Role | Description |
|------|-------------|
| `owner` | Club owner or organization administrator. Full control over the organization, including billing, settings, and member management. |
| `manager` | High-level operational manager. Can manage teams, rosters, events, and most staff functions. |
| `coach` | Team coach. Access to rosters, events, matches, and player development data. |
| `analyst` | Data analyst. Access to stats, performance data, MMR calculations, and VOD review. |
| `player` | Registered player. Can view their own data, team schedule, and limited team information. |
| `community_manager` | Manages community-facing content, social media integration, and fan engagement features. |
| `partner_manager` | Manages sponsor and partner relationships, including sponsor visibility and contract data. |
| `viewer` | Guest or invited viewer. Read-only access to a limited subset of organization data. |

### 3.2 Permission Matrix

Each role maps to a permission set across functional blocks:

| Functional Block | owner | manager | coach | analyst | player | community_manager | partner_manager | viewer |
|-----------------|:-----:|:-------:|:-----:|:-------:|:------:|:-----------------:|:---------------:|:------:|
| Organization settings | Full | Read | - | - | - | - | - | - |
| Team management | Full | Full | Read | Read | - | - | - | - |
| Roster management | Full | Full | Full | Read | Self | - | - | - |
| Events & calendar | Full | Full | Full | Read | Read | Read | - | Read |
| Matches & competitions | Full | Full | Full | Full | Read | Read | - | Read |
| Stats & MMR | Full | Full | Full | Full | Self | - | - | - |
| Discipline & sanctions | Full | Full | Full | Read | Self | - | - | - |
| Community features | Full | Read | - | - | - | Full | - | - |
| Partners & sponsors | Full | Read | - | - | - | - | Full | - |
| Security & audit logs | Full | Read | - | - | - | - | - | - |

**Legend**: Full = Create/Read/Update/Delete, Read = Read-only, Self = Own data only, - = No access

### 3.3 MVP Implementation

For the MVP phase:
- The permission matrix is **hard-coded** in the backend as a `ROLE_PERMISSIONS[role]` map.
- Permissions are enforced for critical actions first (creating events, managing matches, editing stats).
- In later phases, organizations may be able to customize their permission matrix.

---

## 4. Public & Community Roles (Future)

A future layer will support public-facing and community engagement features with dedicated roles.

### 4.1 Community Roles

| Role | Description |
|------|-------------|
| `fan` / `community_member` | Logged-in users who follow teams, interact with content, participate in polls, and engage with community features. Can see curated public stats but never internal MMR, discipline records, or private notes. |
| `public_viewer` | Anonymous visitors or users browsing public pages. Can see public team profiles, match schedules/results, sponsor information, and other publicly shared content. |

### 4.2 Scope

These roles are designed for:
- The public marketing website (`synexia.gg`).
- Potential microsites for individual teams or leagues.
- Social/community features within the platform.

### 4.3 Current Status

- **Not implemented** in the current codebase.
- Current development focus is internal staff roles.
- Public/community features will be added in a future development phase.

---

## 5. Domains, Authentication, and SSO Vision

Synexia Nexus is designed with a split-domain architecture to separate marketing/public content from the operational platform.

### 5.1 Domain Structure

| Domain | Purpose | Technology |
|--------|---------|------------|
| `synexia.gg` | Marketing/corporate website. Landing pages, blog, public team/league profiles, sponsor showcases. | Initially an external CMS (e.g., WordPress). May eventually include community/fan features. |
| `app.synexia.gg` | Main Synexia Nexus HUB. Staff panel for teams, players, matches, events, stats, and all operational features. | React SPA + Synexia Nexus backend. Uses the platform's own identity system (User + JWT). |

### 5.2 Identity Source of Truth

The **Synexia Nexus backend** is the single source of truth for identity:
- All critical authentication flows happen against this backend.
- The HUB (`app.synexia.gg`) authenticates directly with the backend.
- Other frontends (including WordPress) will be clients of this identity system.

### 5.3 Addressing "Double Login" Concerns

**Short term (MVP / Early phases)**:
- The marketing site (`synexia.gg`) does not require login for most use cases.
- Only the HUB (`app.synexia.gg`) requires login.
- No real double-login problem exists in early stages.

**Medium/Long term**:
- When the public site needs login for community/fan features, the backend will expose an OAuth2/OpenID Connect style flow.
- The marketing site (WordPress or similar) will delegate login to the Synexia auth backend.
- Users will experience **single sign-on (SSO)** across `synexia.gg` and `app.synexia.gg`.

### 5.4 Future SSO Flow (Conceptual)

```
User visits synexia.gg/community
    │
    ▼
WordPress detects user not logged in
    │
    ▼
Redirects to auth.synexia.gg/authorize (or similar)
    │
    ▼
User logs in (or is already logged in via HUB session)
    │
    ▼
Redirects back to synexia.gg with auth token/code
    │
    ▼
WordPress validates token and creates session
```

---

## 6. Current Implementation Status

This document is a **design-level reference**. The current implementation covers:

| Feature | Status |
|---------|--------|
| User model with email/password authentication | Implemented |
| JWT-based auth for the HUB | Implemented |
| Basic login UI in React frontend | Implemented |
| Platform-level roles | Not yet implemented |
| Organization-level role enforcement | Partial (schema exists, enforcement not complete) |
| Public/community roles | Not yet implemented |
| OAuth2/OIDC for SSO | Not yet implemented |

---

## 7. References

- [Main Architecture Document](../ARCHITECTURE.md)
- [Modules Overview](../MODULES.md)
- [Nexus Teams Module](../module-nexus-teams-core.md)
- [Stats & MMR Module](../module-stats-mmr.md)
