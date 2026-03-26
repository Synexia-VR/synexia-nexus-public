import { computeShooterRoleScore } from '../../src/modules/nexus-teams/services/shooterScoringService';

describe('computeShooterRoleScore', () => {
  describe('Below minimum stats', () => {
    it('returns 0/0 for zero stats with ENTRY role', () => {
      const result = computeShooterRoleScore({
        adr: 0,
        kad: 0,
        kd: 0,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.roleScore).toBe(0);
      expect(result.score).toBe(0);
      expect(result.adrScore).toBe(0);
      expect(result.kadScore).toBe(0);
      expect(result.kdScore).toBe(0);
    });

    it('returns 0/0 for stats at minimum thresholds', () => {
      const result = computeShooterRoleScore({
        adr: 70,
        kad: 0.8,
        kd: 0.7,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.roleScore).toBe(0);
      expect(result.score).toBe(0);
    });
  });

  describe('Perfect stats', () => {
    it('returns 100/10 for stats at optimal', () => {
      const result = computeShooterRoleScore({
        adr: 100,
        kad: 1.4,
        kd: 1.1,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.roleScore).toBe(100);
      expect(result.score).toBe(10);
      expect(result.adrScore).toBe(100);
      expect(result.kadScore).toBe(100);
      expect(result.kdScore).toBe(100);
    });

    it('returns 100/10 for stats above optimal', () => {
      const result = computeShooterRoleScore({
        adr: 130,
        kad: 2.0,
        kd: 2.0,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.roleScore).toBe(100);
      expect(result.score).toBe(10);
    });
  });

  describe('Mid-range stats (linear interpolation)', () => {
    it('returns ~50 for stats halfway between min and max', () => {
      const result = computeShooterRoleScore({
        adr: 85,
        kad: 1.1,
        kd: 0.9,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.adrScore).toBe(50);
      expect(result.kadScore).toBe(50);
      expect(result.kdScore).toBe(50);
      expect(result.roleScore).toBe(50);
      expect(result.score).toBe(5);
    });

    it('returns weighted score for mixed stats', () => {
      const result = computeShooterRoleScore({
        adr: 100,
        kad: 0.8,
        kd: 0.7,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.adrScore).toBe(100);
      expect(result.kadScore).toBe(0);
      expect(result.kdScore).toBe(0);
      expect(result.roleScore).toBe(50);
      expect(result.score).toBe(5);
    });
  });

  describe('Fallback behavior', () => {
    it('handles lowercase role names', () => {
      const result = computeShooterRoleScore({
        adr: 100,
        kad: 1.4,
        kd: 1.1,
        role: 'entry',
        gameCode: 'breachers',
      });

      expect(result.roleScore).toBe(100);
      expect(typeof result.score).toBe('number');
    });

    it('falls back to DEFAULT for unknown role', () => {
      const result = computeShooterRoleScore({
        adr: 90,
        kad: 1.25,
        kd: 1.0,
        role: 'UNKNOWN_ROLE',
        gameCode: 'breachers',
      });

      expect(result.roleScore).toBe(100);
      expect(typeof result.score).toBe('number');
    });

    it('falls back to breachers for unknown game', () => {
      const result = computeShooterRoleScore({
        adr: 100,
        kad: 1.4,
        kd: 1.1,
        role: 'ENTRY',
        gameCode: 'unknown_game',
      });

      expect(result.roleScore).toBe(100);
      expect(typeof result.score).toBe('number');
    });

    it('handles null role and gameCode', () => {
      const result = computeShooterRoleScore({
        adr: 90,
        kad: 1.25,
        kd: 1.0,
        role: null,
        gameCode: null,
      });

      expect(result.roleScore).toBe(100);
      expect(result.roleScore).toBeLessThanOrEqual(100);
      expect(typeof result.score).toBe('number');
    });
  });

  describe('Score precision', () => {
    it('roleScore is an integer 0-100', () => {
      const result = computeShooterRoleScore({
        adr: 85,
        kad: 1.1,
        kd: 0.9,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(Number.isInteger(result.roleScore)).toBe(true);
      expect(result.roleScore).toBeGreaterThanOrEqual(0);
      expect(result.roleScore).toBeLessThanOrEqual(100);
    });

    it('score has one decimal place', () => {
      const result = computeShooterRoleScore({
        adr: 85,
        kad: 1.1,
        kd: 0.9,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      const decimalPlaces = (result.score.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });

  describe('ENTRY role - component score verification', () => {
    it('stat at min → 0 score for that component', () => {
      const result = computeShooterRoleScore({
        adr: 70,
        kad: 1.4,
        kd: 1.1,
        role: 'ENTRY',
        gameCode: 'breachers',
      });
      expect(result.adrScore).toBe(0);
      expect(result.kadScore).toBe(100);
      expect(result.kdScore).toBe(100);
    });

    it('stat at max → 100 score for that component', () => {
      const result = computeShooterRoleScore({
        adr: 100,
        kad: 0.8,
        kd: 0.7,
        role: 'ENTRY',
        gameCode: 'breachers',
      });
      expect(result.adrScore).toBe(100);
      expect(result.kadScore).toBe(0);
      expect(result.kdScore).toBe(0);
    });

    it('stat halfway between min and max → 50 score for that component', () => {
      const result = computeShooterRoleScore({
        adr: 85,
        kad: 1.1,
        kd: 0.9,
        role: 'ENTRY',
        gameCode: 'breachers',
      });
      expect(result.adrScore).toBe(50);
      expect(result.kadScore).toBe(50);
      expect(result.kdScore).toBe(50);
    });
  });

  describe('ENTRY role - weighted sum verification', () => {
    it('verifies weighted sum calculation with ENTRY weights (ADR 0.50, KAD 0.30, KD 0.20)', () => {
      const result = computeShooterRoleScore({
        adr: 100,
        kad: 1.1,
        kd: 0.9,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.adrScore).toBe(100);
      expect(result.kadScore).toBe(50);
      expect(result.kdScore).toBe(50);
      expect(result.roleScore).toBe(75);
      expect(result.score).toBe(7.5);
    });

    it('verifies weighted sum with all zeros', () => {
      const result = computeShooterRoleScore({
        adr: 70,
        kad: 0.8,
        kd: 0.7,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(result.adrScore).toBe(0);
      expect(result.kadScore).toBe(0);
      expect(result.kdScore).toBe(0);
      expect(result.roleScore).toBe(0);
      expect(result.score).toBe(0);
    });
  });

  describe('Role-specific weights', () => {
    it('IGL weights KD more heavily than ENTRY', () => {
      const baseStats = { adr: 65, kad: 0.975, kd: 0.75 };

      const iglResult = computeShooterRoleScore({
        ...baseStats,
        role: 'IGL',
        gameCode: 'breachers',
      });

      const entryResult = computeShooterRoleScore({
        ...baseStats,
        role: 'ENTRY',
        gameCode: 'breachers',
      });

      expect(iglResult.kdScore).toBe(50);
      expect(entryResult.kdScore).toBe(13);
    });
  });
});
