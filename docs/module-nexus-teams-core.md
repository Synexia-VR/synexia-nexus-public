# Módulo: Nexus Teams – Core

## Objetivo

**Nexus Teams** es el módulo de gestión de equipos y staff de Synexia Nexus.  
Su objetivo es cubrir las necesidades básicas de un club/equipo competitivo amateur o semi-profesional:

- Gestionar organizaciones y sus equipos.
- Gestionar rosters y roles de jugadores.
- Organizar calendario de entrenos, scrims, partidos y reviews.
- Registrar partidos y resultados.
- Tener una base para stats y MMR interno.
- Dar herramientas básicas a manager y coach para el día a día.

En el **MVP 1** vamos a centrarnos en la parte **CORE**: multi-org, equipos, jugadores, eventos, partidos básicos y notificaciones simples.

---

## Alcance del MVP 1 – Nexus Teams Core

### 1. Core multi-organización

Tablas (nivel conceptual):

- `users`
  - Identidad global de usuario (email, password hash o identidades externas).

- `organizations`
  - Club o entidad que usa la plataforma.
  - Campos relevantes:
    - `name`
    - `slug`
    - `timezone` (IANA string, ej: "Europe/Madrid")
    - `plan_tier` (free, team, club_plus, org_elite)
    - `primary_color`, `secondary_color` (branding)
    - fechas de creación/actualización.

- `organization_users`
  - Relación usuario ↔ organización.
  - Campos relevantes:
    - `organization_id`
    - `user_id`
    - `org_role`:
      - owner, manager, coach, analyst, player, viewer.
    - estado (activo, invitado, etc.).

- `modules` / `organization_modules`
  - `modules`:
    - lista de módulos de Nexus (teams, leagues, sponsors, members, community).
  - `organization_modules`:
    - qué módulos están activos para cada organización.
  - En el MVP, todas las orgs tienen `teams` activo; el resto se consideran futuros módulos.

Lógica:

- Autenticación por JWT (mínimo para MVP).
- Middleware que:
  - valida el token,
  - obtiene `user_id`,
  - obtiene `organization_id` activa,
  - obtiene `org_role`,
  - mete esta información en el contexto de la request.
- Ningún endpoint de negocio acepta `organization_id` del cliente:
  - siempre se derivará del contexto del usuario autenticado.

---

### 2. Equipos y jugadores

Tablas principales:

- `teams`
  - `id`
  - `organization_id`
  - `game_id` (de una tabla `games`, aunque en MVP solo haya 1 juego activo).
  - `name`
  - `tag`
  - `category` (main, academy, etc.)
  - `accent_color` (para diferenciar equipos dentro de la org, ej: equipo principal vs academia).

- `players`
  - `id`
  - `organization_id`
  - `user_id` (opcional, si el jugador tiene usuario en la plataforma)
  - `nickname`
  - `main_role` (texto libre: IGL, entry, support, etc.)
  - `status` (active, inactive, trial, etc.)

- `team_rosters`
  - `team_id`
  - `player_id`
  - `role_in_team` (texto: IGL, entry, support...)
  - `status` (active, bench, etc.)

Funciones:

- Crear equipos dentro de una organización.
- Añadir/quitar jugadores de un roster.
- Marcar rol interno del jugador en el equipo.
- Diferenciar equipos (ej. main / academy) por `category` y `accent_color`.

---

### 3. Eventos y calendario

Tablas:

- `events`
  - `id`
  - `organization_id`
  - `team_id`
  - `type`:
    - training, scrim, match, vod_review.
  - `title`
  - `description`
  - `start_datetime_utc`
  - `end_datetime_utc`
  - `location` o información del servidor.
  - `created_by`

- `event_attendance`
  - `id`
  - `event_id`
  - `player_id`
  - `status`:
    - invited, in, out, maybe.
  - `attended` (bool o enum simple: yes/no).

Funciones:

- Crear/editar/borrar eventos de un equipo.
- Ver calendario de eventos por equipo y por organización.
- Permitir marcar disponibilidad y asistencia de jugadores.
- En el MVP, no se implementan aún vistas muy avanzadas, solo lo necesario para:
  - organizar sesiones,
  - saber quién viene.

---

### 4. Partidos básicos

Tablas:

- `matches`
  - `id`
  - `organization_id`
  - `team_id`
  - `event_id` (opcional, si el partido está vinculado a un evento)
  - `opponent_name`
  - `competition_name` (texto libre)
  - `result`:
    - win, loss, draw.
  - `map` / `map_name`
  - `played_at_utc`

Funciones:

- Registrar un partido en menos de 1 minuto:
  - seleccionar equipo,
  - rival,
  - resultado,
  - mapa,
  - fecha/hora.
- Mostrar una lista de partidos recientes por equipo.

*(Las stats detalladas por jugador y el MMR se especificarán en `module-stats-mmr.md` más adelante.)*

---

### 5. Notificaciones simples (MVP)

Alcance inicial:

- Notificaciones básicas para eventos:
  - al crear un evento importante (scrim, match),
  - un recordatorio X horas antes de empezar.

Canales:

- **Discord**:
  - Webhook por organización o por equipo.
  - Embed simple con:
    - título del evento,
    - equipo, fecha y hora,
    - tipo (training, scrim, match, vod_review).

- **Email**:
  - Enviar un correo simple a los usuarios/jugadores convocados:
    - asunto con el título del evento,
    - cuerpo con detalles básicos (fecha, hora, equipo, tipo).

Detalles técnicos se documentarán en `module-notifications.md` en cuanto se concrete el diseño del job de notificaciones y las reglas.

---

## Notas sobre idiomas

- El código (nombres de modelos, campos, enums, rutas) estará en **inglés**.
- Los textos visibles para el usuario se gestionarán en:
  - `frontend/src/i18n/en.json` (base),
  - `frontend/src/i18n/es.json` (traducción).
- El MVP 1 ya debe estar preparado para EN/ES, aunque inicialmente se puede priorizar el contenido en inglés.