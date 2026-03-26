# Synexia Nexus Architecture Overview

This document provides a high-level overview of the Synexia Nexus platform architecture. For detailed information on specific topics, refer to the linked documents.

## Platform Summary

Synexia Nexus is a modular SaaS platform for esports team management. It is designed as a **modular monolith**: a single application organized into domain-specific modules that can be enabled/disabled per organization.

## Core Architecture Principles

- **Multi-tenancy**: Multiple organizations (clubs, teams, leagues) share the same platform.
- **Modular design**: Features are organized into modules that can be activated per organization.
- **12-factor compliance**: Configuration via environment variables, stateless processes, and portable deployment.
- **API-first**: All features are accessible via REST API, enabling future mobile apps and integrations.

## Key Architecture Areas

### RBAC & Identity

Synexia Nexus implements a multi-layered access control system:

- **Platform roles**: Control SaaS-level administration (platform_owner, platform_admin, platform_support).
- **Organization roles**: Control access within each organization (owner, manager, coach, analyst, player, viewer, etc.).
- **Public/community roles** (future): Enable fan engagement and public content viewing.

The Synexia Nexus backend serves as the **single identity provider** for all frontends:
- `app.synexia.gg` (HUB): Uses direct JWT authentication.
- `synexia.gg` (Marketing site): Will use OAuth2/OIDC to delegate auth to the backend.

For complete details, see [05-rbac-and-identity.md](./05-rbac-and-identity.md).

### Module Architecture

The platform is organized into domain modules:

| Module | Status | Description |
|--------|--------|-------------|
| `core` | Implemented | Users, organizations, roles, modules, authentication |
| `nexus-teams` | Implemented | Teams, players, rosters, events, matches, stats, MMR |
| `nexus-leagues` | Planned | Leagues, tournaments, cross-organization competitions |
| `nexus-sponsors` | Planned | Sponsor management, partnerships |
| `nexus-members` | Planned | Membership tiers, subscriptions |
| `nexus-community` | Planned | Fan engagement, Discord integration |

### Technology Stack

**Backend**:
- Node.js + TypeScript
- Express.js (HTTP framework)
- Prisma (ORM)
- PostgreSQL (database)
- JWT (authentication)

**Frontend**:
- React + TypeScript
- Vite (build tool)
- React Router (routing)
- i18n support (EN, ES)

### Deployment

Current:
- Replit Core as development environment
- Replit Deployments for production (VM target)

Future:
- Docker/docker-compose for portable deployment
- VPS/cloud provider support

## Document Index

| Document | Description |
|----------|-------------|
| [05-rbac-and-identity.md](./05-rbac-and-identity.md) | RBAC system, platform/org roles, SSO vision |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Original architecture document (Spanish) |
| [../MODULES.md](../MODULES.md) | Module system overview |
| [../module-nexus-teams-core.md](../module-nexus-teams-core.md) | Nexus Teams module specification |
| [../module-stats-mmr.md](../module-stats-mmr.md) | Stats and MMR calculation system |
