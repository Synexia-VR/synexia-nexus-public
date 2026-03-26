export type RoleMetricThresholds = {
  vMin: number;
  vOptimal: number;
  vObjective?: number;
};

export type RoleStandardConfig = {
  weightAdr: number;
  weightKad: number;
  weightKd: number;
  thresholds: {
    adr: RoleMetricThresholds;
    kad: RoleMetricThresholds;
    kd: RoleMetricThresholds;
  };
};

type GameRoleStandards = Record<string, RoleStandardConfig>;

export const STANDARD_ROLE_STANDARDS: Record<string, GameRoleStandards> = {
  breachers: {
    DEFAULT: {
      weightAdr: 0.45,
      weightKad: 0.35,
      weightKd: 0.20,
      thresholds: {
        adr: { vMin: 60, vOptimal: 90, vObjective: 75 },
        kad: { vMin: 0.70, vOptimal: 1.25, vObjective: 1.00 },
        kd: { vMin: 0.65, vOptimal: 1.00, vObjective: 0.80 },
      },
    },
    ENTRY: {
      weightAdr: 0.50,
      weightKad: 0.30,
      weightKd: 0.20,
      thresholds: {
        adr: { vMin: 70, vOptimal: 100, vObjective: 85 },
        kad: { vMin: 0.80, vOptimal: 1.40, vObjective: 1.10 },
        kd: { vMin: 0.70, vOptimal: 1.10, vObjective: 0.90 },
      },
    },
    FLANKER: {
      weightAdr: 0.45,
      weightKad: 0.40,
      weightKd: 0.15,
      thresholds: {
        adr: { vMin: 65, vOptimal: 90, vObjective: 80 },
        kad: { vMin: 0.80, vOptimal: 1.30, vObjective: 1.00 },
        kd: { vMin: 0.70, vOptimal: 1.10, vObjective: 0.90 },
      },
    },
    FLEX: {
      weightAdr: 0.45,
      weightKad: 0.35,
      weightKd: 0.20,
      thresholds: {
        adr: { vMin: 60, vOptimal: 90, vObjective: 75 },
        kad: { vMin: 0.70, vOptimal: 1.25, vObjective: 1.00 },
        kd: { vMin: 0.65, vOptimal: 1.00, vObjective: 0.80 },
      },
    },
    IGL: {
      weightAdr: 0.35,
      weightKad: 0.25,
      weightKd: 0.40,
      thresholds: {
        adr: { vMin: 50, vOptimal: 80, vObjective: 65 },
        kad: { vMin: 0.75, vOptimal: 1.20, vObjective: 0.90 },
        kd: { vMin: 0.60, vOptimal: 0.90, vObjective: 0.70 },
      },
    },
    SUPPORT: {
      weightAdr: 0.35,
      weightKad: 0.25,
      weightKd: 0.40,
      thresholds: {
        adr: { vMin: 50, vOptimal: 80, vObjective: 65 },
        kad: { vMin: 0.70, vOptimal: 1.20, vObjective: 0.90 },
        kd: { vMin: 0.60, vOptimal: 0.90, vObjective: 0.70 },
      },
    },
  },
};
