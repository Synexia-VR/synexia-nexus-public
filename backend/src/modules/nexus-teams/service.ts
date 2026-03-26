import prisma from '../../db/client';
import type { PlayerMmrHistory, OrganizationRole } from '@prisma/client';
import { computeShooterRoleScore } from './services/shooterScoringService';

/**
 * Nexus Teams Service
 * 
 * Handles business logic for Games, Teams, Players, Rosters, Events, Matches,
 * Shooter Stats, and MMR calculations.
 * 
 * TODO: In the future, organizationId should come from the authenticated user context
 * (via JWT middleware), not from direct client input. This is a temporary implementation
 * for the MVP phase.
 */

export type ShooterPlayerAggregateStats = {
  playerId: string;
  nickname: string;
  mainRole: string | null;
  mapsPlayed: number;
  matchesPlayed: number;
  roundsPlayed: number;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  kd: number;
  kad: number;
  kaPerRound: number;
  roleScore: number;
  score: number;
  roleScoreAdr: number;
  roleScoreKad: number;
  roleScoreKd: number;
};

export type ShooterMapAggregateStats = {
  mapName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  mapWinRate: number; // 0–1
  teamAdr: number;
};

export interface ShooterTeamSummary {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  teamNpr: number;
  teamAdr: number | null;
  teamKd: number | null;
  teamKad: number | null;
}

export interface ShooterTeamMatchSummary {
  matchId: string;
  playedAtUtc: Date | null;
  opponentName: string | null;
  mapName: string | null;
  roundsWon: number | null;
  roundsLost: number | null;
  result: 'pending' | 'win' | 'loss' | 'draw';
  teamNpr: number | null;
  teamAdr: number | null;
  teamKd: number | null;
  teamKad: number | null;
}

export interface ShooterTeamOverview {
  summary: ShooterTeamSummary;
  matches: ShooterTeamMatchSummary[];
}

export type MatchWithStats = {
  match: {
    id: string;
    playedAtUtc: Date | null;
    opponentName: string | null;
    mapName: string | null;
    roundsWon: number | null;
    roundsLost: number | null;
    result: string | null;
  };
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    roundsPlayed: number;
  }[];
};

export function computeShooterTeamOverview(
  matchesWithStats: MatchWithStats[]
): ShooterTeamOverview {
  if (matchesWithStats.length === 0) {
    return {
      summary: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        teamNpr: 0,
        teamAdr: null,
        teamKd: null,
        teamKad: null,
      },
      matches: [],
    };
  }

  const matchSummaries: ShooterTeamMatchSummary[] = [];

  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let totalRoundsWon = 0;
  let totalRoundsLost = 0;
  let globalKills = 0;
  let globalDeaths = 0;
  let globalAssists = 0;
  let globalRounds = 0;
  let globalDamage = 0;

  for (const { match, stats } of matchesWithStats) {
    const roundsWon = match.roundsWon;
    const roundsLost = match.roundsLost;
    const teamNpr =
      roundsWon != null && roundsLost != null ? roundsWon - roundsLost : null;

    let matchKills = 0;
    let matchDeaths = 0;
    let matchAssists = 0;
    let matchRounds = 0;
    let matchDamage = 0;

    for (const s of stats) {
      matchKills += s.kills;
      matchDeaths += s.deaths;
      matchAssists += s.assists;
      matchRounds += s.roundsPlayed;
      matchDamage += s.adr * s.roundsPlayed;
    }

    globalKills += matchKills;
    globalDeaths += matchDeaths;
    globalAssists += matchAssists;
    globalRounds += matchRounds;
    globalDamage += matchDamage;

    const teamAdr = matchRounds > 0 ? matchDamage / matchRounds : null;
    const teamKd = matchDeaths > 0 ? matchKills / matchDeaths : null;
    const teamKad =
      matchDeaths > 0 ? (matchKills + matchAssists) / matchDeaths : null;

    const resultLower = (match.result || 'pending').toLowerCase() as
      | 'pending'
      | 'win'
      | 'loss'
      | 'draw';

    if (resultLower === 'win') totalWins++;
    else if (resultLower === 'loss') totalLosses++;
    else if (resultLower === 'draw') totalDraws++;

    if (roundsWon != null) totalRoundsWon += roundsWon;
    if (roundsLost != null) totalRoundsLost += roundsLost;

    matchSummaries.push({
      matchId: match.id,
      playedAtUtc: match.playedAtUtc,
      opponentName: match.opponentName,
      mapName: match.mapName,
      roundsWon,
      roundsLost,
      result: resultLower,
      teamNpr,
      teamAdr,
      teamKd,
      teamKad,
    });
  }

  const matchesPlayed = matchesWithStats.length;
  const winRate = matchesPlayed > 0 ? (totalWins / matchesPlayed) * 100 : 0;
  const teamNprGlobal = totalRoundsWon - totalRoundsLost;
  const teamAdrGlobal = globalRounds > 0 ? globalDamage / globalRounds : null;
  const teamKdGlobal = globalDeaths > 0 ? globalKills / globalDeaths : null;
  const teamKadGlobal =
    globalDeaths > 0 ? (globalKills + globalAssists) / globalDeaths : null;

  matchSummaries.sort((a, b) => {
    if (!a.playedAtUtc && !b.playedAtUtc) return 0;
    if (!a.playedAtUtc) return 1;
    if (!b.playedAtUtc) return -1;
    return b.playedAtUtc.getTime() - a.playedAtUtc.getTime();
  });

  return {
    summary: {
      matchesPlayed,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winRate,
      teamNpr: teamNprGlobal,
      teamAdr: teamAdrGlobal,
      teamKd: teamKdGlobal,
      teamKad: teamKadGlobal,
    },
    matches: matchSummaries,
  };
}

// ============================================================================
// GAMES
// ============================================================================

/**
 * Returns all Game records.
 */
export async function listGames() {
  return await prisma.game.findMany({
    orderBy: { name: 'asc' }
  });
}

/**
 * Creates and returns a new Game.
 */
export async function createGame(input: {
  code: string;
  name: string;
  gameType: string;
}) {
  return await prisma.game.create({
    data: {
      code: input.code,
      name: input.name,
      gameType: input.gameType
    }
  });
}

// ============================================================================
// TEAMS
// ============================================================================

/**
 * Returns all Team records.
 * If filters.organizationId is provided, filter by that organizationId.
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 */

export async function listTeams(filters?: { organizationId?: string }) {
  const organizationId = filters?.organizationId;
  if (!organizationId) return []; // 🔒 nunca devolvemos “todas”

  return await prisma.team.findMany({
    where: { organizationId },
    include: {
      game: true,
      organization: true,
      _count: {
        select: { teamRosters: true, events: true, matches: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createTeam(input: {
  organizationId: string;
  gameId: string;
  name: string;
  tag?: string;
  category?: string;
  accentColor?: string;
}) {
  return await prisma.team.create({
    data: {
      organizationId: input.organizationId,
      gameId: input.gameId,
      name: input.name,
      tag: input.tag,
      category: input.category,
      accentColor: input.accentColor
    },
    include: {
      game: true,
      organization: true
    }
  });
}

// ============================================================================
// PLAYERS
// ============================================================================

/**
 * Returns all Player records, optionally filtered by organizationId.
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 */

export async function listPlayers(filters?: { organizationId?: string }) {
  const organizationId = filters?.organizationId;
  if (!organizationId) return []; // 🔒 nunca devolvemos “todas”

  return await prisma.player.findMany({
    where: { organizationId },
    include: {
      organization: true,
      user: {
        select: { id: true }, // 🔒 NO email
      },
      _count: {
        select: { teamRosters: true },
      },
    },
    orderBy: { nickname: "asc" },
  });
}

/**
 * Creates and returns a new Player.
 * If status is not provided, defaults to "active".
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 */
export async function createPlayer(input: {
  organizationId: string;
  nickname: string;
  mainRole?: string;
  status?: string;
  userId?: string | null;
}) {
  return await prisma.player.create({
    data: {
      organizationId: input.organizationId,
      nickname: input.nickname,
      mainRole: input.mainRole,
      status: input.status || 'active',
      userId: input.userId ?? null
    },
    include: {
      organization: true,
      user: {
        select: { id: true },
      },
    }
  });
}

// ============================================================================
// TEAM ROSTERS
// ============================================================================

/**
 * Returns all TeamRoster records for the given teamId.
 * Includes the related Player information.
 */
export async function listTeamRoster(teamId: string) {
  return await prisma.teamRoster.findMany({
    where: { teamId },
    include: {
      player: {
        select: {
          id: true,
          nickname: true,
          mainRole: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Adds a player to a team roster.
 * If status is not provided, defaults to "active".
 * 
 * Note: Respects the @@unique([teamId, playerId]) constraint.
 * If a duplicate is attempted, Prisma will throw a P2002 error.
 */
export async function addPlayerToTeam(input: {
  teamId: string;
  playerId: string;
  roleInTeam?: string;
  status?: string;
}) {
  return await prisma.teamRoster.create({
    data: {
      teamId: input.teamId,
      playerId: input.playerId,
      roleInTeam: input.roleInTeam,
      status: input.status || 'active'
    },
    include: {
      player: {
        select: {
          id: true,
          nickname: true,
          mainRole: true,
          status: true
        }
      }
    }
  });
}

/**
 * Removes a player from a team roster.
 * Returns the deleted entry, or null if not found.
 */
export async function removePlayerFromTeam(teamId: string, playerId: string) {
  const existing = await prisma.teamRoster.findUnique({
    where: {
      teamId_playerId: { teamId, playerId }
    }
  });

  if (!existing) {
    return null;
  }

  return await prisma.teamRoster.delete({
    where: {
      teamId_playerId: { teamId, playerId }
    }
  });
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Returns Event records filtered by the provided criteria.
 * Orders by startDatetimeUtc ascending.
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 * TODO: Timezone conversions might be refined later (currently assumes UTC ISO strings).
 */
export async function listEvents(filters?: {
  organizationId?: string;
  teamId?: string;
  type?: string;
}) {
  const where: any = {};

  if (filters?.organizationId) {
    where.organizationId = filters.organizationId;
  }
  if (filters?.teamId) {
    where.teamId = filters.teamId;
  }
  if (filters?.type) {
    where.type = filters.type;
  }

  return await prisma.event.findMany({
    where,
    include: {
      team: {
        select: {
          id: true,
          name: true,
          tag: true
        }
      }
    },
    orderBy: { startDatetimeUtc: 'asc' }
  });
}

/**
 * Creates and returns a new Event.
 * Converts ISO date strings to Date objects.
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 * TODO: Timezone conversions might be refined later (currently assumes UTC ISO strings).
 * 
 * @throws Error if required fields are missing or dates are invalid.
 */
export async function createEvent(input: {
  organizationId: string;
  teamId: string;
  type: string;
  title: string;
  description?: string;
  startDatetimeUtc: string;
  endDatetimeUtc?: string;
  location?: string;
  createdByUserId?: string | null;
}) {
  if (!input.organizationId || !input.teamId || !input.type || !input.title || !input.startDatetimeUtc) {
    throw new Error('missing_required_fields');
  }

  const startDate = new Date(input.startDatetimeUtc);
  if (isNaN(startDate.getTime())) {
    throw new Error('invalid_datetime');
  }

  let endDate: Date | null = null;
  if (input.endDatetimeUtc) {
    endDate = new Date(input.endDatetimeUtc);
    if (isNaN(endDate.getTime())) {
      throw new Error('invalid_datetime');
    }
  }

  return await prisma.event.create({
    data: {
      organizationId: input.organizationId,
      teamId: input.teamId,
      type: input.type,
      title: input.title,
      description: input.description,
      startDatetimeUtc: startDate,
      endDatetimeUtc: endDate,
      location: input.location,
      createdByUserId: input.createdByUserId ?? null
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          tag: true
        }
      }
    }
  });
}

// ============================================================================
// MATCHES
// ============================================================================

/**
 * Returns Match records filtered by the provided criteria.
 * Orders by playedAtUtc descending (latest first).
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 */
export async function listMatches(filters?: {
  organizationId?: string;
  teamId?: string;
}) {
  const where: any = {};

  if (filters?.organizationId) {
    where.organizationId = filters.organizationId;
  }
  if (filters?.teamId) {
    where.teamId = filters.teamId;
  }

  return await prisma.match.findMany({
    where,
    include: {
      team: {
        select: {
          id: true,
          name: true,
          tag: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          type: true
        }
      }
    },
    orderBy: { playedAtUtc: 'desc' }
  });
}

/**
 * Creates and returns a new Match.
 * Converts ISO date string to Date object.
 * 
 * TODO: organizationId should come from authenticated user context, not from client.
 * TODO: Timezone conversions might be refined later (currently assumes UTC ISO strings).
 * 
 * @throws Error if required fields are missing or date is invalid.
 */
export async function createMatch(input: {
  organizationId: string;
  teamId: string;
  eventId?: string | null;
  opponentName: string;
  competitionName?: string;
  result: string;
  mapName?: string;
  playedAtUtc: string;
}) {
  if (!input.organizationId || !input.teamId || !input.opponentName || !input.result || !input.playedAtUtc) {
    throw new Error('missing_required_fields');
  }

  const playedDate = new Date(input.playedAtUtc);
  if (isNaN(playedDate.getTime())) {
    throw new Error('invalid_datetime');
  }

  return await prisma.match.create({
    data: {
      organizationId: input.organizationId,
      teamId: input.teamId,
      eventId: input.eventId ?? null,
      opponentName: input.opponentName,
      competitionName: input.competitionName,
      result: input.result,
      mapName: input.mapName,
      playedAtUtc: playedDate
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          tag: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          type: true
        }
      }
    }
  });
}

// ============================================================================
// SHOOTER MATCH STATS
// ============================================================================

/**
 * Upserts shooter match stats for a match.
 * For each stat entry, creates or updates the ShooterMatchStat record.
 * Uses a transaction to ensure all stats are saved atomically.
 * Also, if roundsWon/roundsLost are provided, updates the Match with
 * roundsWon, roundsLost and result ("win" | "loss" | "draw").
 */
export async function upsertShooterMatchStatsForMatch(
  matchId: string,
  stats: Array<{
    playerId: string;
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    roundsPlayed?: number;
  }>,
  options?: {
    roundsWon?: number;
    roundsLost?: number;
  }
) {
  const hasRounds =
    typeof options?.roundsWon === "number" &&
    typeof options?.roundsLost === "number" &&
    !Number.isNaN(options.roundsWon) &&
    !Number.isNaN(options.roundsLost) &&
    options.roundsWon >= 0 &&
    options.roundsLost >= 0;

  const totalRounds = hasRounds
    ? (options!.roundsWon as number) + (options!.roundsLost as number)
    : undefined;

  return await prisma.$transaction(async (tx) => {
    // 1) Actualizamos el propio Match si tenemos rondas
    if (hasRounds) {
      let result: string = "pending";

      if ((options!.roundsWon as number) > (options!.roundsLost as number)) {
        result = "win";
      } else if (
        (options!.roundsWon as number) < (options!.roundsLost as number)
      ) {
        result = "loss";
      } else {
        result = "draw";
      }

      await tx.match.update({
        where: { id: matchId },
        data: {
          roundsWon: options!.roundsWon as number,
          roundsLost: options!.roundsLost as number,
          result,
        },
      });
    }

    // 2) Upsert de stats por jugador
    const results = [];

    for (const stat of stats) {
      // Si en el payload ya viene roundsPlayed con un número válido, lo usamos.
      // Si no, usamos el total de rondas del partido (roundsWon + roundsLost).
      const roundsPlayedValue =
        typeof stat.roundsPlayed === "number" &&
        !Number.isNaN(stat.roundsPlayed)
          ? stat.roundsPlayed
          : totalRounds;

      const upserted = await tx.shooterMatchStat.upsert({
        where: {
          matchId_playerId: { matchId, playerId: stat.playerId },
        },
        update: {
          kills: stat.kills,
          deaths: stat.deaths,
          assists: stat.assists,
          adr: stat.adr,
          ...(typeof roundsPlayedValue === "number"
            ? { roundsPlayed: roundsPlayedValue }
            : {}),
        },
        create: {
          matchId,
          playerId: stat.playerId,
          kills: stat.kills,
          deaths: stat.deaths,
          assists: stat.assists,
          adr: stat.adr,
          // En create sí forzamos un número; si no hay info, 0.
          roundsPlayed: roundsPlayedValue ?? 0,
        },
        include: {
          player: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      results.push(upserted);
    }

    return results;
  });
}

/**
 * Returns all ShooterMatchStat records for a match.
 * Includes player basic info.
 */
export async function getShooterMatchStatsForMatch(matchId: string) {
  return await prisma.shooterMatchStat.findMany({
    where: { matchId },
    include: {
      player: {
        select: {
          id: true,
          nickname: true,
          mainRole: true,
          status: true,
        },
      },
    },
  });
}


// ============================================================================
// MMR CALCULATION
// ============================================================================

/**
 * MMR Weights (fixed for MVP):
 * - Performance: 60%
 * - Commitment: 25%
 * - Behavior: 15%
 */
const MMR_WEIGHTS = {
  performance: 0.6,
  commitment: 0.25,
  behavior: 0.15
};

/**
 * Linearly scales a value from an input range to an output range.
 */
function linearScale(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export async function getShooterPlayerStatsForTeam(args: {
  organizationId: string;
  teamId: string;
  from?: Date;
  to?: Date;
  gameCode?: string;
}): Promise<ShooterPlayerAggregateStats[]> {
  const { organizationId, teamId, from, to, gameCode } = args;

  const matchDateFilter =
    from || to
      ? {
          playedAtUtc: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const rows = await prisma.shooterMatchStat.findMany({
    where: {
      match: {
        organizationId,
        teamId,
        ...matchDateFilter,
      },
    },
    include: {
      player: true,
      match: {
        select: { id: true },
      },
    },
  });

  type Acc = {
    playerId: string;
    nickname: string;
    mainRole: string | null;
    kills: number;
    deaths: number;
    assists: number;
    roundsPlayed: number;
    totalDamage: number;
    matchIds: Set<string>;
  };

  const byPlayer = new Map<string, Acc>();

  for (const row of rows) {
    const key = row.playerId;
    let acc = byPlayer.get(key);
    if (!acc) {
      acc = {
        playerId: row.playerId,
        nickname: row.player.nickname,
        mainRole: row.player.mainRole,
        kills: 0,
        deaths: 0,
        assists: 0,
        roundsPlayed: 0,
        totalDamage: 0,
        matchIds: new Set<string>(),
      };
      byPlayer.set(key, acc);
    }

    acc.kills += row.kills;
    acc.deaths += row.deaths;
    acc.assists += row.assists;

    const rp = row.roundsPlayed ?? 0;
    acc.roundsPlayed += rp;

    acc.totalDamage += row.adr * rp;

    acc.matchIds.add(row.match.id);
  }

  const result: ShooterPlayerAggregateStats[] = [];

  for (const acc of byPlayer.values()) {
    const matchesPlayed = acc.matchIds.size;
    const mapsPlayed = matchesPlayed;
    const kills = acc.kills;
    const deaths = acc.deaths;
    const assists = acc.assists;
    const roundsPlayed = acc.roundsPlayed;

    const kd = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
    const kad = deaths > 0 ? (kills + assists) / deaths : kills + assists;
    const kaPerRound = roundsPlayed > 0 ? (kills + assists) / roundsPlayed : 0;

    const adr = roundsPlayed > 0 ? acc.totalDamage / roundsPlayed : 0;

    const scoring = computeShooterRoleScore({
      adr,
      kad,
      kd,
      role: acc.mainRole,
      gameCode: gameCode ?? 'breachers',
    });

    result.push({
      playerId: acc.playerId,
      nickname: acc.nickname,
      mainRole: acc.mainRole,
      mapsPlayed,
      matchesPlayed,
      roundsPlayed,
      kills,
      deaths,
      assists,
      adr,
      kd,
      kad,
      kaPerRound,
      roleScore: scoring.roleScore,
      score: scoring.score,
      roleScoreAdr: scoring.adrScore,
      roleScoreKad: scoring.kadScore,
      roleScoreKd: scoring.kdScore,
    });
  }

  result.sort((a, b) => b.adr - a.adr);

  return result;
}

export async function getShooterMapStatsForTeam(args: {
  organizationId: string;
  teamId: string;
  from?: Date;
  to?: Date;
}): Promise<ShooterMapAggregateStats[]> {
  const { organizationId, teamId, from, to } = args;

  const matchDateFilter =
    from || to
      ? {
          playedAtUtc: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const matches = await prisma.match.findMany({
    where: {
      organizationId,
      teamId,
      ...matchDateFilter,
      result: {
        not: null,
      },
    },
    include: {
      shooterMatchStats: true,
    },
  });

  type Acc = {
    mapName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    teamAdrSum: number;
  };

  const byMap = new Map<string, Acc>();

  for (const match of matches) {
    const mapName = match.mapName ?? 'Unknown';

    let acc = byMap.get(mapName);
    if (!acc) {
      acc = {
        mapName,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        teamAdrSum: 0,
      };
      byMap.set(mapName, acc);
    }

    acc.matchesPlayed += 1;

    const result = (match.result || '').toLowerCase();
    if (result === 'win') acc.wins += 1;
    else if (result === 'loss') acc.losses += 1;
    else acc.draws += 1;

    const stats = match.shooterMatchStats;
    if (stats && stats.length > 0) {
      const avgAdr =
        stats.reduce((sum, s) => sum + s.adr, 0) / stats.length;
      acc.teamAdrSum += avgAdr;
    }
  }

  const result: ShooterMapAggregateStats[] = [];

  for (const acc of byMap.values()) {
    const mapWinRate =
      acc.matchesPlayed > 0 ? acc.wins / acc.matchesPlayed : 0;
    const teamAdr =
      acc.matchesPlayed > 0 ? acc.teamAdrSum / acc.matchesPlayed : 0;

    result.push({
      mapName: acc.mapName,
      matchesPlayed: acc.matchesPlayed,
      wins: acc.wins,
      losses: acc.losses,
      draws: acc.draws,
      mapWinRate,
      teamAdr,
    });
  }

  result.sort((a, b) => b.mapWinRate - a.mapWinRate);

  return result;
}

export async function getShooterTeamOverview(args: {
  organizationId: string;
  teamId: string;
  from?: Date;
  to?: Date;
}): Promise<ShooterTeamOverview> {
  const { organizationId, teamId, from, to } = args;

  const matchDateFilter =
    from || to
      ? {
          playedAtUtc: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const matches = await prisma.match.findMany({
    where: {
      organizationId,
      teamId,
      ...matchDateFilter,
      roundsWon: { not: null },
      roundsLost: { not: null },
      shooterMatchStats: { some: {} },
    },
    include: {
      shooterMatchStats: {
        include: {
          player: {
            select: { organizationId: true },
          },
        },
      },
    },
    orderBy: { playedAtUtc: 'desc' },
  });

  const matchesWithStats: MatchWithStats[] = matches.map((m) => ({
    match: {
      id: m.id,
      playedAtUtc: m.playedAtUtc,
      opponentName: m.opponentName,
      mapName: m.mapName,
      roundsWon: m.roundsWon,
      roundsLost: m.roundsLost,
      result: m.result,
    },
    stats: m.shooterMatchStats
      .filter((s) => s.player.organizationId === organizationId)
      .map((s) => ({
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        adr: s.adr,
        roundsPlayed: s.roundsPlayed ?? 0,
      })),
  }));

  return computeShooterTeamOverview(matchesWithStats);
}

/**
 * Calculates player MMR for the last 30 days.
 * 
 * MMR Components:
 * - Performance (60%): Based on ADR and K/D ratio from ShooterMatchStats
 * - Commitment (25%): Based on attendance to training/scrim/match events
 * - Behavior (15%): Based on active sanctions
 * 
 * TODO: In the future, organizationId scope will come from auth context.
 * 
 * @returns The created PlayerMmrHistory record, or null if no stats found.
 */
export async function calculatePlayerMmrForLast30Days(playerId: string): Promise<PlayerMmrHistory | null> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = now;

  // =========================================================================
  // PERFORMANCE BLOCK (shooter stats)
  // =========================================================================
  
  const shooterStats = await prisma.shooterMatchStat.findMany({
    where: {
      playerId,
      match: {
        playedAtUtc: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    },
    include: {
      match: {
        select: {
          playedAtUtc: true
        }
      }
    }
  });

  let performanceScore = 0;

  if (shooterStats.length > 0) {
    const totalKills = shooterStats.reduce((sum, s) => sum + s.kills, 0);
    const totalDeaths = shooterStats.reduce((sum, s) => sum + s.deaths, 0);
    const totalAssists = shooterStats.reduce((sum, s) => sum + s.assists, 0);
    const sumAdr = shooterStats.reduce((sum, s) => sum + s.adr, 0);
    const countMatches = shooterStats.length;

    const avgAdr = sumAdr / countMatches;
    const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;

    // ADR scale: 50 -> 40, 150 -> 100
    const adrScore = linearScale(avgAdr, 50, 150, 40, 100);

    // K/D scale: 0.8 -> 40, 1.5 -> 100
    const kdScore = linearScale(kd, 0.8, 1.5, 40, 100);

    performanceScore = 0.7 * adrScore + 0.3 * kdScore;
  }
  // NOTE: If no stats, performanceScore = 0 (player has no recent match data)

  // =========================================================================
  // COMMITMENT BLOCK (attendance)
  // =========================================================================
  
  const attendanceRecords = await prisma.eventAttendance.findMany({
    where: {
      playerId,
      event: {
        startDatetimeUtc: {
          gte: periodStart,
          lte: periodEnd
        },
        type: {
          in: ['training', 'scrim', 'match']
        }
      }
    }
  });

  let commitmentScore = 0;

  if (attendanceRecords.length > 0) {
    const convocados = attendanceRecords.length;
    const asistidos = attendanceRecords.filter(a => a.attended === true).length;
    commitmentScore = (asistidos / convocados) * 100;
  }
  // NOTE: If no events, commitmentScore = 0 (player has no scheduled events in period)

  // =========================================================================
  // BEHAVIOR BLOCK (sanctions)
  // =========================================================================
  
  const activeSanctions = await prisma.playerSanction.findMany({
    where: {
      playerId,
      active: true
      // NOTE: For MVP, we consider all active sanctions regardless of issuedAt.
      // Future improvement: filter by issuedAt >= periodStart if desired.
    }
  });

  const totalSeverity = activeSanctions.reduce((sum, s) => sum + s.severity, 0);
  let behaviorScore = 100 - totalSeverity * 10;
  behaviorScore = Math.max(0, Math.min(100, behaviorScore)); // Clamp to [0, 100]

  // =========================================================================
  // FINAL MMR
  // =========================================================================
  
  const mmrValue = Math.round(
    MMR_WEIGHTS.performance * performanceScore +
    MMR_WEIGHTS.commitment * commitmentScore +
    MMR_WEIGHTS.behavior * behaviorScore
  );

  // Store in PlayerMmrHistory
  const mmrRecord = await prisma.playerMmrHistory.create({
    data: {
      playerId,
      periodStart,
      periodEnd,
      mmrValue,
      performanceScore,
      commitmentScore,
      behaviorScore
    }
  });

  return mmrRecord;
}

/**
 * Recalculates MMR for all players in an organization.
 * 
 * TODO: In the future, organizationId will come from auth context.
 */
export async function recalculateMmrForOrganization(organizationId: string): Promise<void> {
  const players = await prisma.player.findMany({
    where: { organizationId },
    select: { id: true }
  });

  for (const player of players) {
    await calculatePlayerMmrForLast30Days(player.id);
  }
}

/**
 * Returns the latest PlayerMmrHistory record for a player.
 */
export async function getLatestPlayerMmr(playerId: string): Promise<PlayerMmrHistory | null> {
  return await prisma.playerMmrHistory.findFirst({
    where: { playerId },
    orderBy: { calculatedAt: 'desc' }
  });
}

/**
 * Returns a Match by its ID.
 * Used for permission checks (e.g., to get organizationId for RBAC).
 */
export async function getMatchById(matchId: string) {
  return await prisma.match.findUnique({
    where: { id: matchId }
  });
}

export async function deleteMatchById(matchId: string) {
  // Gracias a onDelete: Cascade en ShooterMatchStat,
  // al borrar el Match se borran automáticamente sus stats.
  return await prisma.match.delete({
    where: { id: matchId },
  });
}

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

export interface OrganizationMemberDTO {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: OrganizationRole;
  createdAt: Date;
}

/**
 * Returns all members of an organization.
 * Includes user info for each membership.
 */
export async function listOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberDTO[]> {
  const memberships = await prisma.userOrganizationMembership.findMany({
    where: { organizationId },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    email: m.user.email,
    displayName: m.user.displayName ?? null,
    role: m.role,
    createdAt: m.createdAt,
  }));
}

/**
 * Adds a new member to an organization by email.
 * Throws error if user not found or already a member.
 */
export async function addOrganizationMemberByEmail(
  organizationId: string,
  userEmail: string,
  role: OrganizationRole
): Promise<OrganizationMemberDTO> {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new Error("user_not_found");
  }

  const existing = await prisma.userOrganizationMembership.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
  });

  if (existing) {
    throw new Error("membership_already_exists");
  }

  const membership = await prisma.userOrganizationMembership.create({
    data: {
      userId: user.id,
      organizationId,
      role,
    },
    include: {
      user: true,
    },
  });

  return {
    membershipId: membership.id,
    userId: membership.userId,
    email: membership.user.email,
    displayName: membership.user.displayName ?? null,
    role: membership.role,
    createdAt: membership.createdAt,
  };
}

/**
 * Updates the role of an organization member.
 * Returns the updated member or throws error if membership is from another org.
 */
export async function updateOrganizationMemberRole(
  organizationId: string,
  membershipId: string,
  role: OrganizationRole
): Promise<OrganizationMemberDTO | null> {
  const existingMembership = await prisma.userOrganizationMembership.findUnique({
    where: { id: membershipId },
  });

  if (!existingMembership) {
    return null;
  }

  if (existingMembership.organizationId !== organizationId) {
    throw new Error("membership_wrong_organization");
  }

  const membership = await prisma.userOrganizationMembership.update({
    where: {
      id: membershipId,
    },
    data: {
      role,
    },
    include: {
      user: true,
    },
  });

  return {
    membershipId: membership.id,
    userId: membership.userId,
    email: membership.user.email,
    displayName: membership.user.displayName ?? null,
    role: membership.role,
    createdAt: membership.createdAt,
  };
}

/**
 * Removes a member from an organization.
 * Validates the membership belongs to the specified organization.
 * Prevents removing the last OWNER of the organization.
 */
export async function removeOrganizationMember(
  organizationId: string,
  membershipId: string
): Promise<void> {
  const membership = await prisma.userOrganizationMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership) {
    throw new Error("membership_not_found");
  }

  if (membership.organizationId !== organizationId) {
    throw new Error("membership_wrong_organization");
  }

  if (membership.role === "OWNER") {
    const ownersCount = await prisma.userOrganizationMembership.count({
      where: {
        organizationId: membership.organizationId,
        role: "OWNER",
      },
    });

    if (ownersCount <= 1) {
      throw new Error("cannot_remove_last_owner");
    }
  }

  await prisma.userOrganizationMembership.delete({
    where: { id: membershipId },
  });
}


// ============================================================================
// USER TEAM MEMBERSHIPS
// ============================================================================

export async function listUserTeamMembershipsForOrg(organizationId: string) {
  return prisma.userTeamMembership.findMany({
    where: { organizationId },
    include: {
      user: true,
      team: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function createUserTeamMembership(input: {
  organizationId: string;
  teamId: string;
  userId: string;
  role: 'PLAYER' | 'COACH' | 'ANALYST' | 'STAFF';
}) {
  return prisma.userTeamMembership.create({
    data: {
      organizationId: input.organizationId,
      teamId: input.teamId,
      userId: input.userId,
      role: input.role,
    },
    include: {
      user: true,
      team: true,
    },
  });
}

export async function deleteUserTeamMembership(
  organizationId: string,
  membershipId: string
) {
  const result = await prisma.userTeamMembership.deleteMany({
    where: { id: membershipId, organizationId },
  });

  if (result.count === 0) {
    throw new Error("membership_not_found_or_wrong_org");
  }
}

