# DEV LOG – Synexia Nexus

Registro de decisiones y hitos de desarrollo.

---

## 000 - Inicio del proyecto

- Se define el proyecto **Synexia Nexus** como el core modular de Synexia.
- Se decide que el **primer módulo** a implementar será **Nexus Teams**.
- Arquitectura base:
  - monolito modular,
  - backend en Node.js + TypeScript + Express/Fastify,
  - frontend en React + Vite,
  - base de datos PostgreSQL.
- Infraestructura inicial:
  - desarrollo y despliegue en Replit Core + Deployments.
- Se adopta el enfoque 12-factor:
  - configuración por variables de entorno,
  - Dockerfile y docker-compose para facilitar futura migración a VPS/cloud.
- Se establece que:
  - el **idioma base de la plataforma** es el inglés (EN),
  - habrá soporte de traducción al castellano (ES) mediante archivos `en.json` / `es.json`.
- Se crean los documentos de arquitectura y módulos:
  - `ARCHITECTURE.md`
  - `MODULES.md`
  - `module-nexus-teams-core.md`