import { computeShooterTeamOverview, MatchWithStats } from '../../src/modules/nexus-teams/service';

describe('computeShooterTeamOverview', () => {
  it('returns zeros and nulls when no matches provided', () => {
    const result = computeShooterTeamOverview([]);

    expect(result.summary.matchesPlayed).toBe(0);
    expect(result.summary.wins).toBe(0);
    expect(result.summary.losses).toBe(0);
    expect(result.summary.draws).toBe(0);
    expect(result.summary.winRate).toBe(0);
    expect(result.summary.teamNpr).toBe(0);
    expect(result.summary.teamAdr).toBeNull();
    expect(result.summary.teamKd).toBeNull();
    expect(result.summary.teamKad).toBeNull();
    expect(result.matches).toHaveLength(0);
  });

  it('calculates correctly for a single match with 2 players', () => {
    const matchesWithStats: MatchWithStats[] = [
      {
        match: {
          id: 'match-1',
          playedAtUtc: new Date('2024-01-15T18:00:00Z'),
          opponentName: 'Team Alpha',
          mapName: 'Dust',
          roundsWon: 13,
          roundsLost: 7,
          result: 'win',
        },
        stats: [
          { kills: 20, deaths: 10, assists: 5, adr: 100, roundsPlayed: 20 },
          { kills: 15, deaths: 12, assists: 8, adr: 80, roundsPlayed: 20 },
        ],
      },
    ];

    const result = computeShooterTeamOverview(matchesWithStats);

    expect(result.summary.matchesPlayed).toBe(1);
    expect(result.summary.wins).toBe(1);
    expect(result.summary.losses).toBe(0);
    expect(result.summary.draws).toBe(0);
    expect(result.summary.winRate).toBe(100);
    expect(result.summary.teamNpr).toBe(6);

    expect(result.summary.teamAdr).toBe(90);
    expect(result.summary.teamKd).toBeCloseTo(35 / 22, 4);
    expect(result.summary.teamKad).toBeCloseTo((35 + 13) / 22, 4);

    expect(result.matches).toHaveLength(1);
    const m = result.matches[0];
    expect(m.matchId).toBe('match-1');
    expect(m.roundsWon).toBe(13);
    expect(m.roundsLost).toBe(7);
    expect(m.teamNpr).toBe(6);
    expect(m.teamAdr).toBe(90);
    expect(m.teamKd).toBeCloseTo(35 / 22, 4);
    expect(m.teamKad).toBeCloseTo((35 + 13) / 22, 4);
    expect(m.result).toBe('win');
  });

  it('calculates correctly for multiple matches with different results', () => {
    const matchesWithStats: MatchWithStats[] = [
      {
        match: {
          id: 'match-1',
          playedAtUtc: new Date('2024-01-10T18:00:00Z'),
          opponentName: 'Team A',
          mapName: 'MapA',
          roundsWon: 13,
          roundsLost: 5,
          result: 'win',
        },
        stats: [
          { kills: 25, deaths: 10, assists: 5, adr: 110, roundsPlayed: 18 },
        ],
      },
      {
        match: {
          id: 'match-2',
          playedAtUtc: new Date('2024-01-12T18:00:00Z'),
          opponentName: 'Team B',
          mapName: 'MapB',
          roundsWon: 7,
          roundsLost: 13,
          result: 'loss',
        },
        stats: [
          { kills: 12, deaths: 15, assists: 3, adr: 70, roundsPlayed: 20 },
        ],
      },
      {
        match: {
          id: 'match-3',
          playedAtUtc: new Date('2024-01-14T18:00:00Z'),
          opponentName: 'Team C',
          mapName: 'MapC',
          roundsWon: 10,
          roundsLost: 10,
          result: 'draw',
        },
        stats: [
          { kills: 18, deaths: 18, assists: 6, adr: 90, roundsPlayed: 20 },
        ],
      },
    ];

    const result = computeShooterTeamOverview(matchesWithStats);

    expect(result.summary.matchesPlayed).toBe(3);
    expect(result.summary.wins).toBe(1);
    expect(result.summary.losses).toBe(1);
    expect(result.summary.draws).toBe(1);
    expect(result.summary.winRate).toBeCloseTo(33.333, 2);

    expect(result.summary.teamNpr).toBe((13 - 5) + (7 - 13) + (10 - 10));

    const globalKills = 25 + 12 + 18;
    const globalDeaths = 10 + 15 + 18;
    const globalAssists = 5 + 3 + 6;
    const globalRounds = 18 + 20 + 20;
    const globalDamage = 110 * 18 + 70 * 20 + 90 * 20;

    expect(result.summary.teamAdr).toBeCloseTo(globalDamage / globalRounds, 4);
    expect(result.summary.teamKd).toBeCloseTo(globalKills / globalDeaths, 4);
    expect(result.summary.teamKad).toBeCloseTo(
      (globalKills + globalAssists) / globalDeaths,
      4
    );

    expect(result.matches).toHaveLength(3);
    expect(result.matches[0].matchId).toBe('match-3');
    expect(result.matches[1].matchId).toBe('match-2');
    expect(result.matches[2].matchId).toBe('match-1');
  });

  it('handles match with no deaths (returns null for KD/KAD)', () => {
    const matchesWithStats: MatchWithStats[] = [
      {
        match: {
          id: 'match-1',
          playedAtUtc: new Date('2024-01-15T18:00:00Z'),
          opponentName: 'Team X',
          mapName: 'Map1',
          roundsWon: 13,
          roundsLost: 0,
          result: 'win',
        },
        stats: [
          { kills: 30, deaths: 0, assists: 10, adr: 150, roundsPlayed: 13 },
        ],
      },
    ];

    const result = computeShooterTeamOverview(matchesWithStats);

    expect(result.summary.matchesPlayed).toBe(1);
    expect(result.summary.teamAdr).toBe(150);
    expect(result.summary.teamKd).toBeNull();
    expect(result.summary.teamKad).toBeNull();
    expect(result.matches[0].teamKd).toBeNull();
    expect(result.matches[0].teamKad).toBeNull();
  });

  it('handles match with null rounds', () => {
    const matchesWithStats: MatchWithStats[] = [
      {
        match: {
          id: 'match-1',
          playedAtUtc: null,
          opponentName: null,
          mapName: null,
          roundsWon: null,
          roundsLost: null,
          result: 'pending',
        },
        stats: [
          { kills: 10, deaths: 5, assists: 3, adr: 80, roundsPlayed: 10 },
        ],
      },
    ];

    const result = computeShooterTeamOverview(matchesWithStats);

    expect(result.summary.matchesPlayed).toBe(1);
    expect(result.summary.teamNpr).toBe(0);
    expect(result.matches[0].teamNpr).toBeNull();
    expect(result.matches[0].roundsWon).toBeNull();
    expect(result.matches[0].roundsLost).toBeNull();
  });
});
