import { STANDARD_ROLE_STANDARDS, RoleMetricThresholds } from '../config/roleStandards';

export type ShooterRoleScoreInput = {
  adr: number;
  kad: number;
  kd: number;
  role?: string | null;
  gameCode?: string | null;
};

export type ShooterRoleScoreResult = {
  roleScore: number;
  score: number;
  adrScore: number;
  kadScore: number;
  kdScore: number;
};

function normalizeStat(stat: number, min: number, max: number): number {
  if (!isFinite(stat)) return 0;
  if (stat <= min) return 0;
  if (stat >= max) return 100;
  if (max === min) return 0;
  return ((stat - min) / (max - min)) * 100;
}

function normalizeMetricTo0_100(value: number, t: RoleMetricThresholds): number {
  return normalizeStat(value, t.vMin, t.vOptimal);
}

export function computeShooterRoleScore(input: ShooterRoleScoreInput): ShooterRoleScoreResult {
  const gameKey = (input.gameCode ?? 'breachers').toLowerCase();
  const roleKey = (input.role ?? 'DEFAULT').toUpperCase();

  const gameConfig = STANDARD_ROLE_STANDARDS[gameKey] ?? STANDARD_ROLE_STANDARDS['breachers'];
  const roleConfig = gameConfig[roleKey] ?? gameConfig['DEFAULT'];

  const adrScore = normalizeMetricTo0_100(input.adr ?? 0, roleConfig.thresholds.adr);
  const kadScore = normalizeMetricTo0_100(input.kad ?? 0, roleConfig.thresholds.kad);
  const kdScore = normalizeMetricTo0_100(input.kd ?? 0, roleConfig.thresholds.kd);

  const sumWeights = roleConfig.weightAdr + roleConfig.weightKad + roleConfig.weightKd || 1;
  const wAdr = roleConfig.weightAdr / sumWeights;
  const wKad = roleConfig.weightKad / sumWeights;
  const wKd = roleConfig.weightKd / sumWeights;

  const roleScoreRaw = adrScore * wAdr + kadScore * wKad + kdScore * wKd;
  const roleScore = Math.round(roleScoreRaw);

  const score = Number((roleScore / 10).toFixed(1));

  return {
    roleScore,
    score,
    adrScore: Math.round(adrScore),
    kadScore: Math.round(kadScore),
    kdScore: Math.round(kdScore),
  };
}
