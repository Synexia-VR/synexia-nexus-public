import { requireAuth } from '../auth';
import prisma from '../../db/client';
import { Router, type Express, type Request, type Response, type NextFunction } from 'express';
import { mutationLimiter } from '../../middleware/rateLimit';
import {
  requireOrgIdFromParams,
  requireOrgIdFromQuery,
  requireOrgIdFromBody,
  requireOrgMembership,
  requireOrgPermission
} from '../../middleware/orgContext';
import { parseBody, createPlayerSchema, createPlayerBodySchema, addToRosterSchema } from '../../utils/validate';
import { asyncHandler } from '../../middleware/asyncHandler';
import { notFound, forbidden, badRequest } from '../../errors/AppError';
import {
  listGames,
  createGame,
  listTeams,
  createTeam,
  listPlayers,
  createPlayer,
  listTeamRoster,
  addPlayerToTeam,
  removePlayerFromTeam,
  listEvents,
  createEvent,
  listMatches,
  createMatch,
  upsertShooterMatchStatsForMatch,
  getShooterMatchStatsForMatch,
  calculatePlayerMmrForLast30Days,
  recalculateMmrForOrganization,
  getLatestPlayerMmr,
  getMatchById,
  listOrganizationMembers,
  addOrganizationMemberByEmail,
  updateOrganizationMemberRole,
  removeOrganizationMember,
  getShooterPlayerStatsForTeam,
  getShooterMapStatsForTeam,
  getShooterTeamOverview,
  deleteMatchById,
  listUserTeamMembershipsForOrg,
  createUserTeamMembership,
  deleteUserTeamMembership
} from './service';
import {
  canUserManageEvents,
  canUserManageMatches,
  canUserEditStats,
  canUserManageOrgMembers,
  canUserManageTeams,
  canUserManageTeamMemberships,
  isUserMemberOfOrg,
  canUserRecalculateMmr
} from './permissions';

function limitMutations(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") return next();
  if (req.method === "GET") return next();
  return (mutationLimiter as any)(req, res, next);
}

/**
 * Attaches Nexus Teams routes to the Express app.
 * 
 * Routes:
 * - GET  /api/games
 * - POST /api/games
 * - GET  /api/teams
 * - POST /api/teams
 * - GET  /api/teams/:teamId/roster
 * - POST /api/teams/:teamId/roster
 * - DELETE /api/teams/:teamId/roster/:playerId
 * - GET  /api/teams/:teamId/events
 * - GET  /api/teams/:teamId/matches
 * - GET  /api/players
 * - POST /api/players
 * - GET  /api/players/:playerId/mmr
 * - GET  /api/events
 * - POST /api/events
 * - GET  /api/matches
 * - POST /api/matches
 * - GET  /api/matches/:matchId/stats
 * - POST /api/matches/:matchId/stats
 * - POST /api/mmr/recalculate
 */
export function attachNexusTeamsRoutes(app: Express): void {
  const gamesRouter = Router();
  const teamsRouter = Router();
  const playersRouter = Router();
  const eventsRouter = Router();
  const matchesRouter = Router();
  const mmrRouter = Router();
  const statsRouter = Router();
  const organizationsRouter = Router();

// 🔒 Todo lo que no sea /api/games (GET) requiere login
teamsRouter.use(requireAuth);
playersRouter.use(requireAuth);
eventsRouter.use(requireAuth);
matchesRouter.use(requireAuth);
mmrRouter.use(requireAuth);
statsRouter.use(requireAuth);
organizationsRouter.use(requireAuth);

  // ==========================================================================
  // GAMES ROUTES
  // ==========================================================================

  /**
   * GET /api/games
   * Returns all Game records.
   */
  gamesRouter.get('/', async (_req: Request, res: Response) => {
    try {
      const games = await listGames();
      res.json(games);
    } catch (error) {
      console.error('Error listing games:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * POST /api/games
   * Creates a new Game.
   * Body: { code, name, gameType }
   */
  gamesRouter.post('/', limitMutations, async (req: Request, res: Response) => {
    // 🔒 Solo permitir en desarrollo
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ error: "not_found" });
      // (también valdría 403 forbidden, pero 404 “oculta” la ruta)
    }
    
    try {
      const { code, name, gameType } = req.body;

      if (!code || !name || !gameType) {
        return res.status(400).json({ 
          error: 'Missing required fields: code, name, and gameType are required' 
        });
      }

      const game = await createGame({ code, name, gameType });
      res.status(201).json(game);
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // ==========================================================================
  // TEAMS ROUTES
  // ==========================================================================

  /**
   * GET /api/teams
   * Returns all Team records for the organization.
   * Required query param: organizationId
   */
  teamsRouter.get(
    "/",
    requireOrgIdFromQuery(),
    requireOrgMembership(),
    async (req, res) => {
      try {
        const teams = await listTeams({ organizationId: req.orgId! });
        return res.json(teams);
      } catch (e) {
        console.error("Error listing teams:", e);
        return res.status(500).json({ error: "internal_error" });
      }
    }
  );

  /**
   * POST /api/teams
   * Creates a new Team.
   * Body: { organizationId, gameId, name, tag?, category?, accentColor? }
   * 
   * TODO: organizationId should come from authenticated user context in the future.
   */
  teamsRouter.post('/', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      const userId = auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId, gameId, name, tag, category, accentColor } = req.body;

      if (!organizationId) {
        return res.status(400).json({ error: 'missing_organization_id' });
      }

      if (!gameId || !name) {
        return res.status(400).json({ 
          error: 'Missing required fields: gameId and name are required' 
        });
      }

      const allowed = await canUserManageTeams(userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const team = await createTeam({ 
        organizationId, 
        gameId, 
        name, 
        tag, 
        category, 
        accentColor 
      });
      res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // ==========================================================================
  // TEAM ROSTER ROUTES
  // ==========================================================================

  /**
   * GET /api/teams/:teamId/roster
   * Returns all roster entries for a team.
   */
  teamsRouter.get(
    "/:teamId/roster",
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      const { teamId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true },
      });

      if (!team) throw notFound("team_not_found");

      const isMember = await isUserMemberOfOrg(userId, team.organizationId);
      if (!isMember) throw forbidden("forbidden");

      const roster = await listTeamRoster(teamId);
      return res.json(roster);
    })
  );

  /**
   * POST /api/teams/:teamId/roster
   * Adds a player to a team roster.
   * Body: { playerId }
   */
  teamsRouter.post(
    "/:teamId/roster",
    limitMutations,
    parseBody(addToRosterSchema),
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      const { teamId } = req.params;
      const { playerId } = req.body;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true },
      });

      if (!team) throw notFound("team_not_found");

      const canManage = await canUserManageTeams(userId, team.organizationId);
      if (!canManage) throw forbidden("forbidden");

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { organizationId: true },
      });
      if (!player) throw notFound("player_not_found");
      if (player.organizationId !== team.organizationId) {
        throw badRequest("player_not_in_team_org");
      }

      const rosterEntry = await addPlayerToTeam({ teamId, playerId });
      return res.status(201).json(rosterEntry);
    })
  );


  /**
   * DELETE /api/teams/:teamId/roster/:playerId
   * Removes a player from a team roster.
   */
  teamsRouter.delete(
    "/:teamId/roster/:playerId",
    limitMutations,
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      const { teamId, playerId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true },
      });

      if (!team) throw notFound("team_not_found");

      const canManage = await canUserManageTeams(userId, team.organizationId);
      if (!canManage) throw forbidden("forbidden");

      await removePlayerFromTeam(teamId, playerId);
      return res.status(204).send();
    })
  );

  // ==========================================================================
  // TEAM EVENTS ROUTES
  // ==========================================================================

  /**
   * GET /api/teams/:teamId/events
   * Returns all events for a specific team.
   * Optional query param: type
   * Requires org membership.
   */
  teamsRouter.get(
    '/:teamId/events',
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      const { teamId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true },
      });

      if (!team) throw notFound("team_not_found");

      const isMember = await isUserMemberOfOrg(userId, team.organizationId);
      if (!isMember) throw forbidden("forbidden");

      const type = req.query.type as string | undefined;
      const events = await listEvents({ teamId, type });
      return res.json(events);
    })
  );

  // ==========================================================================
  // TEAM MATCHES ROUTES
  // ==========================================================================

  /**
   * GET /api/teams/:teamId/matches
   * Returns all matches for a specific team.
   * Requires org membership.
   */
  teamsRouter.get(
    '/:teamId/matches',
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      const { teamId } = req.params;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true },
      });

      if (!team) throw notFound("team_not_found");

      const isMember = await isUserMemberOfOrg(userId, team.organizationId);
      if (!isMember) throw forbidden("forbidden");

      const matches = await listMatches({ teamId });
      return res.json(matches);
    })
  );

  // ==========================================================================
  // PLAYERS ROUTES
  // ==========================================================================

  /**
   * GET /api/players
   * Returns all Player records for the organization.
   * Required query param: organizationId
   */
  playersRouter.get(
    "/",
    requireOrgIdFromQuery(),
    requireOrgMembership(),
    async (req, res) => {
      try {
        const players = await listPlayers({ organizationId: req.orgId! });
        return res.json(players);
      } catch (e) {
        console.error("Error listing players:", e);
        return res.status(500).json({ error: "internal_error" });
      }
    }
  );


  /**
   * POST /api/players
   * Creates a new Player.
   * Body: { organizationId, nickname, mainRole?, status? }
   * Note: userId in body is ignored for security (prevents unauthorized player-user assignment)
   */
  playersRouter.post(
    "/",
    limitMutations,
    parseBody(createPlayerSchema),
    (req, res, next) => {
      req.orgId = req.body.organizationId;
      next();
    },
    requireOrgPermission(canUserManageTeams),
    async (req, res) => {
      try {
        const { organizationId, nickname } = req.body;
        const player = await createPlayer({
          organizationId,
          nickname,
          userId: null,
        });

        return res.status(201).json(player);
      } catch (e) {
        console.error("Error creating player:", e);
        return res.status(500).json({ error: "internal_error" });
      }
    }
  );

  /**
   * GET /api/players/:playerId/mmr
   * Returns the latest MMR for a player.
   * Requires org membership.
   */
  playersRouter.get(
    '/:playerId/mmr',
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      const { playerId } = req.params;

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { organizationId: true },
      });

      if (!player) throw notFound("player_not_found");

      const isMember = await isUserMemberOfOrg(userId, player.organizationId);
      if (!isMember) throw forbidden("forbidden");

      const mmr = await getLatestPlayerMmr(playerId);

      if (!mmr) throw notFound("mmr_not_found");

      return res.json(mmr);
    })
  );

  // ==========================================================================
  // EVENTS ROUTES
  // ==========================================================================

  /**
   * GET /api/events
   * Returns all Event records for an organization.
   * Required query param: organizationId
   * Optional query params: teamId, type
   * Requires org membership.
   */
  eventsRouter.get(
    '/',
    requireOrgIdFromQuery(),
    requireOrgMembership(),
    async (req, res) => {
      try {
        const teamId = req.query.teamId as string | undefined;
        const type = req.query.type as string | undefined;

        const filters: { organizationId: string; teamId?: string; type?: string } = {
          organizationId: req.orgId!,
        };
        if (teamId) filters.teamId = teamId;
        if (type) filters.type = type;

        const events = await listEvents(filters);
        return res.json(events);
      } catch (error) {
        console.error('Error listing events:', error);
        return res.status(500).json({ error: 'internal_error' });
      }
    }
  );

  /**
   * POST /api/events
   * Creates a new Event.
   * Body: { organizationId, teamId, type, title, description?, startDatetimeUtc, endDatetimeUtc?, location?, createdByUserId? }
   * 
   * Requires authentication and organization-level permission (OWNER, MANAGER, COACH, or ANALYST).
   * TODO: Timezone handling might be refined later (currently assumes UTC ISO strings).
   */
  eventsRouter.post('/', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { 
        organizationId, 
        teamId, 
        type, 
        title, 
        description, 
        startDatetimeUtc, 
        endDatetimeUtc, 
        location, 
        createdByUserId 
      } = req.body;

      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId_required' });
      }

      if (!teamId || !type || !title || !startDatetimeUtc) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }

      const allowed = await canUserManageEvents(auth.userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const event = await createEvent({
        organizationId,
        teamId,
        type,
        title,
        description,
        startDatetimeUtc,
        endDatetimeUtc,
        location,
        createdByUserId: createdByUserId || auth.userId
      });
      res.status(201).json(event);
    } catch (error: any) {
      if (error.message === 'missing_required_fields') {
        return res.status(400).json({ error: 'missing_required_fields' });
      }
      if (error.message === 'invalid_datetime') {
        return res.status(400).json({ error: 'invalid_datetime' });
      }
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // ==========================================================================
  // MATCHES ROUTES
  // ==========================================================================

  /**
   * GET /api/matches
   * Returns all Match records for an organization.
   * Required query param: organizationId
   * Optional query param: teamId
   * Requires org membership.
   */
  matchesRouter.get(
    '/',
    requireOrgIdFromQuery(),
    requireOrgMembership(),
    async (req, res) => {
      try {
        const teamId = req.query.teamId as string | undefined;

        const filters: { organizationId: string; teamId?: string } = {
          organizationId: req.orgId!,
        };
        if (teamId) filters.teamId = teamId;

        const matches = await listMatches(filters);
        return res.json(matches);
      } catch (error) {
        console.error('Error listing matches:', error);
        return res.status(500).json({ error: 'internal_error' });
      }
    }
  );

  /**
   * POST /api/matches
   * Creates a new Match.
   * Body: { organizationId, teamId, eventId?, opponentName, competitionName?, result, mapName?, playedAtUtc }
   * 
   * Requires authentication and organization-level permission (OWNER, MANAGER, COACH, or ANALYST).
   * TODO: Timezone handling might be refined later (currently assumes UTC ISO strings).
   */
  matchesRouter.post('/', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { 
        organizationId, 
        teamId, 
        eventId, 
        opponentName, 
        competitionName, 
        result, 
        mapName, 
        playedAtUtc 
      } = req.body;

      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId_required' });
      }

      if (!teamId || !opponentName || !result || !playedAtUtc) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }

      const allowed = await canUserManageMatches(auth.userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const match = await createMatch({
        organizationId,
        teamId,
        eventId,
        opponentName,
        competitionName,
        result,
        mapName,
        playedAtUtc
      });
      res.status(201).json(match);
    } catch (error: any) {
      if (error.message === 'missing_required_fields') {
        return res.status(400).json({ error: 'missing_required_fields' });
      }
      if (error.message === 'invalid_datetime') {
        return res.status(400).json({ error: 'invalid_datetime' });
      }
      console.error('Error creating match:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * DELETE /api/matches/:matchId
   * 
   * Borra un partido y, por cascada, sus ShooterMatchStat.
   * Solo permitido para OWNER / MANAGER / COACH / ANALYST de esa organización.
   */
  matchesRouter.delete('/:matchId', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { matchId } = req.params;

      if (!matchId) {
        return res.status(400).json({ error: 'matchId_required' });
      }

      const match = await getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ error: 'match_not_found' });
      }

      const organizationId = match.organizationId;

      const allowed = await canUserManageMatches(auth.userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      await deleteMatchById(matchId);

      // 204 No Content, no hace falta body
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting match:', error);
      return res.status(500).json({ error: 'internal_error' });
    }
  });


  // ==========================================================================
  // SHOOTER MATCH STATS ROUTES
  // ==========================================================================

  /**
   * GET /api/matches/:matchId/stats
   * Returns all shooter stats for a match.
   * Requires authentication and organization membership.
   */
  matchesRouter.get('/:matchId/stats', async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      const userId = auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { matchId } = req.params;
      if (!matchId) {
        return res.status(400).json({ error: 'matchId_required' });
      }

      const match = await getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ error: 'match_not_found' });
      }

      const isMember = await isUserMemberOfOrg(userId, match.organizationId);
      if (!isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const stats = await getShooterMatchStatsForMatch(matchId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting match stats:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * POST /api/matches/:matchId/stats
   * Upserts shooter stats for a match.
   * Body: { stats: [{ playerId, kills, deaths, assists, adr, roundsPlayed? }] }
   * 
   * Requires authentication and organization-level permission (OWNER, MANAGER, COACH, or ANALYST).
   */
  
matchesRouter.post('/:matchId/stats', limitMutations, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { matchId } = req.params;
    const { stats, roundsWon, roundsLost } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'matchId_required' });
    }

    const match = await getMatchById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'match_not_found' });
    }

    const organizationId = match.organizationId;
    if (!organizationId) {
      return res.status(500).json({ error: 'match_missing_organization' });
    }

    const allowed = await canUserEditStats(auth.userId, organizationId);
    if (!allowed) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!stats || !Array.isArray(stats)) {
      return res.status(400).json({ error: 'invalid_stats_payload' });
    }

    for (const stat of stats) {
      if (
        !stat.playerId ||
        typeof stat.kills !== 'number' ||
        typeof stat.deaths !== 'number' ||
        typeof stat.assists !== 'number' ||
        typeof stat.adr !== 'number'
      ) {
        return res.status(400).json({ error: 'invalid_stats_payload' });
      }
    }

    let roundsOptions: { roundsWon?: number; roundsLost?: number } | undefined;

    if (
      typeof roundsWon !== 'undefined' ||
      typeof roundsLost !== 'undefined'
    ) {
      const rWon = Number(roundsWon);
      const rLost = Number(roundsLost);

      if (
        Number.isNaN(rWon) ||
        Number.isNaN(rLost) ||
        rWon < 0 ||
        rLost < 0
      ) {
        return res.status(400).json({ error: 'invalid_rounds' });
      }

      roundsOptions = {
        roundsWon: rWon,
        roundsLost: rLost
      };
    }

    const result = await upsertShooterMatchStatsForMatch(
      matchId,
      stats,
      roundsOptions
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Error upserting match stats:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

  // ==========================================================================
  // MMR ROUTES
  // ==========================================================================

  /**
   * POST /api/mmr/recalculate
   * Recalculates MMR.
   * - If playerId is provided, recalculates for that player only.
   * - If organizationId is provided (without playerId), recalculates for all players in org.
   * - If neither is provided, returns 400.
   *
   * RBAC:
   * - Sólo OWNER / MANAGER / COACH / ANALYST de esa organización pueden recalcular.
   */
  mmrRouter.post('/recalculate', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth: any = (req as any).auth;
      const userId: string | undefined = auth?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { playerId, organizationId } = req.body as {
        playerId?: string;
        organizationId?: string;
      };

      // Determinar organizationId a comprobar
      let orgIdToCheck: string | null = organizationId ?? null;

      // Si sólo viene playerId, sacamos la org de ese jugador
      if (!orgIdToCheck && playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          select: { organizationId: true },
        });

        if (!player) {
          return res.status(404).json({ error: 'player_not_found' });
        }

        orgIdToCheck = player.organizationId;
      }

      if (!orgIdToCheck) {
        return res.status(400).json({ error: 'organization_required' });
      }

      // Check de permisos
      const allowed = await canUserRecalculateMmr(userId, orgIdToCheck);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      // Lógica de negocio original
      if (playerId) {
        const mmr = await calculatePlayerMmrForLast30Days(playerId);
        if (!mmr) {
          return res.status(404).json({ error: 'mmr_calculation_failed' });
        }
        return res.json(mmr);
      }

      if (organizationId) {
        await recalculateMmrForOrganization(organizationId);
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'missing_scope' });
    } catch (error) {
      console.error('Error recalculating MMR:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // ==========================================================================
  // SHOOTER STATS ROUTES (TEAM-LEVEL)
  // ==========================================================================

  /**
   * GET /api/stats/shooter/players
   * Query:
   * - organizationId: string (required)
   * - teamId: string (required)
   * - from?: ISO date (YYYY-MM-DD o ISO completo)
   * - to?: ISO date
   *
   * Devuelve stats agregadas por jugador del equipo en el rango.
   * Requiere estar autenticado y ser miembro de la organización.
   */
  statsRouter.get('/shooter/players', async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId, teamId, from, to } = req.query;

      if (!organizationId || !teamId) {
        return res
          .status(400)
          .json({ error: 'organizationId_and_teamId_required' });
      }

      const isMember = await isUserMemberOfOrg(
        auth.userId,
        String(organizationId)
      );
      if (!isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (from) {
        const d = new Date(String(from));
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'invalid_from_date' });
        }
        fromDate = d;
      }

      if (to) {
        const d = new Date(String(to));
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'invalid_to_date' });
        }
        toDate = d;
      }

      const team = await prisma.team.findUnique({
        where: { id: String(teamId) },
        include: { game: true },
      });

      const gameCode = team?.game?.code ?? 'breachers';

      const stats = await getShooterPlayerStatsForTeam({
        organizationId: String(organizationId),
        teamId: String(teamId),
        from: fromDate,
        to: toDate,
        gameCode,
      });

      return res.json(stats);
    } catch (err: any) {
      console.error('Error in GET /api/stats/shooter/players', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * GET /api/stats/shooter/maps
   * Query:
   * - organizationId: string (required)
   * - teamId: string (required)
   * - from?: ISO date
   * - to?: ISO date
   *
   * Devuelve stats agregadas por mapa (winrate, ADR de equipo, etc.).
   * Requiere estar autenticado y ser miembro de la organización.
   */
  statsRouter.get('/shooter/maps', async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId, teamId, from, to } = req.query;

      if (!organizationId || !teamId) {
        return res
          .status(400)
          .json({ error: 'organizationId_and_teamId_required' });
      }

      const isMember = await isUserMemberOfOrg(
        auth.userId,
        String(organizationId)
      );
      if (!isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (from) {
        const d = new Date(String(from));
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'invalid_from_date' });
        }
        fromDate = d;
      }

      if (to) {
        const d = new Date(String(to));
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'invalid_to_date' });
        }
        toDate = d;
      }

      const stats = await getShooterMapStatsForTeam({
        organizationId: String(organizationId),
        teamId: String(teamId),
        from: fromDate,
        to: toDate,
      });

      return res.json(stats);
    } catch (err: any) {
      console.error('Error in GET /api/stats/shooter/maps', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * GET /api/stats/shooter/team
   * Query:
   * - organizationId: string (required)
   * - teamId: string (required)
   * - from?: ISO date
   * - to?: ISO date
   *
   * Returns team overview with summary and per-match stats.
   * Requires authentication and membership in the organization.
   */
  statsRouter.get('/shooter/team', async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId, teamId, from, to } = req.query;

      if (!organizationId || !teamId) {
        return res
          .status(400)
          .json({ error: 'organizationId_and_teamId_required' });
      }

      const isMember = await isUserMemberOfOrg(
        auth.userId,
        String(organizationId)
      );
      if (!isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (from) {
        const d = new Date(String(from));
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'invalid_from_date' });
        }
        fromDate = d;
      }

      if (to) {
        const d = new Date(String(to));
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'invalid_to_date' });
        }
        toDate = d;
      }

      const overview = await getShooterTeamOverview({
        organizationId: String(organizationId),
        teamId: String(teamId),
        from: fromDate,
        to: toDate,
      });

      return res.json(overview);
    } catch (err: any) {
      console.error('Error in GET /api/stats/shooter/team', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  // ==========================================================================
  // ORGANIZATION-SCOPED TEAMS & PLAYERS ROUTES
  // ==========================================================================

  /**
   * GET /api/organizations/:organizationId/teams
   * Returns all teams for an organization.
   * Requires authentication and membership in the organization.
   */
  organizationsRouter.get(
    "/:organizationId/teams",
    requireOrgIdFromParams(),
    requireOrgMembership(),
    asyncHandler(async (req, res) => {
      const teams = await listTeams({ organizationId: req.orgId! });
      return res.json(teams);
    })
  );

  /**
   * GET /api/organizations/:organizationId/players
   * Returns all players for an organization.
   * Requires authentication and membership in the organization.
   */
  organizationsRouter.get(
    "/:organizationId/players",
    requireOrgIdFromParams(),
    requireOrgMembership(),
    asyncHandler(async (req, res) => {
      const players = await listPlayers({ organizationId: req.orgId! });
      return res.json(players);
    })
  );

  /**
   * POST /api/organizations/:organizationId/players
   * Creates a new player for an organization.
   * Requires authentication and permission to manage teams.
   * Body: { nickname }
   */
  organizationsRouter.post(
    "/:organizationId/players",
    limitMutations,
    requireOrgIdFromParams(),
    parseBody(createPlayerBodySchema),
    requireOrgPermission(canUserManageTeams),
    asyncHandler(async (req, res) => {
      const { nickname } = req.body;
      const player = await createPlayer({
        organizationId: req.orgId!,
        nickname,
        userId: null,
      });
      return res.status(201).json(player);
    })
  );

  // ==========================================================================
  // ORGANIZATION MEMBERS ROUTES
  // ==========================================================================

  /**
   * GET /api/organizations/:organizationId/members
   * Returns all members of an organization.
   * Requires authentication and membership in the organization.
   */
  organizationsRouter.get('/:organizationId/members', async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId } = req.params;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId_required' });
      }

      const isMember = await isUserMemberOfOrg(auth.userId, organizationId);
      if (!isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const members = await listOrganizationMembers(organizationId);
      return res.json({ members });
    } catch (err: any) {
      console.error('Error in GET /api/organizations/:organizationId/members', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * POST /api/organizations/:organizationId/members
   * Adds a new member to an organization by email.
   * Requires authentication and OWNER/MANAGER role.
   * Body: { userEmail, role }
   */
  organizationsRouter.post('/:organizationId/members', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId } = req.params;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId_required' });
      }

      const allowed = await canUserManageOrgMembers(auth.userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { userEmail, role } = req.body;

      if (!userEmail || !role) {
        return res.status(400).json({ error: 'userEmail_and_role_required' });
      }

      try {
        const membership = await addOrganizationMemberByEmail(
          organizationId,
          userEmail,
          role
        );
        return res.status(201).json({ member: membership });
      } catch (err: any) {
        if (err.message === 'user_not_found') {
          return res.status(404).json({ error: 'user_not_found' });
        }
        if (err.message === 'membership_already_exists') {
          return res.status(400).json({ error: 'membership_already_exists' });
        }
        console.error('Error in addOrganizationMemberByEmail', err);
        return res.status(500).json({ error: 'internal_error' });
      }
    } catch (err: any) {
      console.error('Error in POST /api/organizations/:organizationId/members', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * PATCH /api/organizations/:organizationId/members/:membershipId
   * Updates the role of an organization member.
   * Requires authentication and OWNER/MANAGER role.
   * Body: { role }
   */
  organizationsRouter.patch('/:organizationId/members/:membershipId', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId, membershipId } = req.params;
      if (!organizationId || !membershipId) {
        return res.status(400).json({ error: 'organizationId_and_membershipId_required' });
      }

      const allowed = await canUserManageOrgMembers(auth.userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: 'role_required' });
      }

      try {
        const updated = await updateOrganizationMemberRole(organizationId, membershipId, role);
        if (!updated) {
          return res.status(404).json({ error: 'membership_not_found' });
        }
        return res.json({ member: updated });
      } catch (err: any) {
        if (err.message === 'membership_wrong_organization') {
          return res.status(400).json({ error: 'membership_wrong_organization' });
        }
        console.error('Error in updateOrganizationMemberRole', err);
        return res.status(500).json({ error: 'internal_error' });
      }
    } catch (err: any) {
      console.error(
        'Error in PATCH /api/organizations/:organizationId/members/:membershipId',
        err
      );
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * DELETE /api/organizations/:organizationId/members/:membershipId
   * Removes a member from an organization.
   * Requires authentication and OWNER/MANAGER role.
   * Prevents removing the last OWNER.
   */
  organizationsRouter.delete('/:organizationId/members/:membershipId', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const { organizationId, membershipId } = req.params;
      if (!organizationId || !membershipId) {
        return res.status(400).json({ error: 'organizationId_and_membershipId_required' });
      }

      const allowed = await canUserManageOrgMembers(auth.userId, organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }

      try {
        await removeOrganizationMember(organizationId, membershipId);
        return res.status(204).send();
      } catch (err: any) {
        if (err.message === 'membership_not_found') {
          return res.status(404).json({ error: 'membership_not_found' });
        }
        if (err.message === 'membership_wrong_organization') {
          return res.status(400).json({ error: 'membership_wrong_organization' });
        }
        if (err.message === 'cannot_remove_last_owner') {
          return res.status(400).json({ error: 'cannot_remove_last_owner' });
        }
        console.error('Error in removeOrganizationMember', err);
        return res.status(500).json({ error: 'internal_error' });
      }
    } catch (err: any) {
      console.error(
        'Error in DELETE /api/organizations/:organizationId/members/:membershipId',
        err
      );
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  // ==========================================================================
  // USER TEAM MEMBERSHIPS ROUTES
  // ==========================================================================

  /**
   * GET /api/organizations/:organizationId/team-memberships
   * Lists all team memberships for an organization.
   * Requires authentication and org membership.
   */
  organizationsRouter.get('/:organizationId/team-memberships', async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      const userId = auth?.userId;
      const { organizationId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const isMember = await isUserMemberOfOrg(userId, organizationId);
      if (!isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const memberships = await listUserTeamMembershipsForOrg(organizationId);
      return res.json(memberships);
    } catch (err) {
      console.error('Error listing team memberships:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * POST /api/organizations/:organizationId/team-memberships
   * Creates a new team membership.
   * Requires authentication and OWNER/MANAGER role.
   */
  organizationsRouter.post('/:organizationId/team-memberships', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      const userId = auth?.userId;
      const { organizationId } = req.params;
      const { teamId, targetUserId, role } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      if (!teamId || !targetUserId || !role) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }

      const canManage = await canUserManageTeamMemberships(userId, organizationId);
      if (!canManage) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const membership = await createUserTeamMembership({
        organizationId,
        teamId,
        userId: targetUserId,
        role,
      });

      return res.status(201).json(membership);
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(400).json({ error: 'membership_already_exists' });
      }
      console.error('Error creating team membership:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  /**
   * DELETE /api/organizations/:organizationId/team-memberships/:membershipId
   * Deletes a team membership.
   * Requires authentication and OWNER/MANAGER role.
   */
  organizationsRouter.delete('/:organizationId/team-memberships/:membershipId', limitMutations, async (req: Request, res: Response) => {
    try {
      const auth = (req as any).auth;
      const userId = auth?.userId;
      const { organizationId, membershipId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const canManage = await canUserManageTeamMemberships(userId, organizationId);
      if (!canManage) {
        return res.status(403).json({ error: 'forbidden' });
      }

      await deleteUserTeamMembership(organizationId, membershipId);
      return res.status(204).send();
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'membership_not_found' });
      }
      console.error('Error deleting team membership:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  // Mount routers
  app.use('/api/games', gamesRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/api/mmr', mmrRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/organizations', organizationsRouter);
}
