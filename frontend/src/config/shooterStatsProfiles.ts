export type ShooterGameKey = "breachers";

export type PlayerStatKey =
  | "matchesPlayed"
  | "roundsPlayed"
  | "mapsPlayed"
  | "kills"
  | "deaths"
  | "assists"
  | "adr"
  | "kd"
  | "kad"
  | "kaPerRound"
  | "roleScoreAdr"
  | "roleScoreKad"
  | "roleScoreKd"
  | "roleScore"
  | "score";

export type TeamStatKey =
  | "matchesPlayed"
  | "wins"
  | "losses"
  | "draws"
  | "winRate"
  | "teamNpr"
  | "teamAdr"
  | "teamKd"
  | "teamKad";

export type MapStatKey =
  | "matchesPlayed"
  | "wins"
  | "losses"
  | "draws"
  | "mapWinRate"
  | "teamAdr";

export interface ShooterGameStatProfile {
  enabledPlayerStats: PlayerStatKey[];
  enabledTeamStats: TeamStatKey[];
  enabledMapStats: MapStatKey[];
}

export const defaultShooterGameProfile: ShooterGameStatProfile = {
  enabledPlayerStats: [
    "matchesPlayed",
    "roundsPlayed",
    "mapsPlayed",
    "kills",
    "deaths",
    "assists",
    "adr",
    "kd",
    "kad",
    "kaPerRound",
    "roleScoreAdr",
    "roleScoreKad",
    "roleScoreKd",
    "roleScore",
    "score",
  ],
  enabledTeamStats: [
    "matchesPlayed",
    "wins",
    "losses",
    "draws",
    "winRate",
    "teamNpr",
    "teamAdr",
    "teamKd",
    "teamKad",
  ],
  enabledMapStats: [
    "matchesPlayed",
    "wins",
    "losses",
    "draws",
    "mapWinRate",
    "teamAdr",
  ],
};

export const shooterGameStatProfiles: Record<ShooterGameKey, ShooterGameStatProfile> = {
  breachers: {
    enabledPlayerStats: [
      "matchesPlayed",
      "roundsPlayed",
      "kills",
      "deaths",
      "assists",
      "adr",
      "kd",
      "kad",
      "kaPerRound",
      "roleScoreAdr",
      "roleScoreKad",
      "roleScoreKd",
      "roleScore",
      "score",
    ],
    enabledTeamStats: [
      "matchesPlayed",
      "wins",
      "losses",
      "draws",
      "winRate",
      "teamNpr",
      "teamAdr",
      "teamKd",
      "teamKad",
    ],
    enabledMapStats: [
      "matchesPlayed",
      "wins",
      "losses",
      "draws",
      "mapWinRate",
      "teamAdr",
    ],
  },
};

export function getShooterGameProfile(gameKey?: ShooterGameKey): ShooterGameStatProfile {
  if (!gameKey) return defaultShooterGameProfile;
  return shooterGameStatProfiles[gameKey] ?? defaultShooterGameProfile;
}
