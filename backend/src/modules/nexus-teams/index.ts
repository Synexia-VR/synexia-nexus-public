import type { Express } from 'express';
import { attachNexusTeamsRoutes } from './routes';

/**
 * Registers the Nexus Teams module with the Express app.
 * 
 * This module provides endpoints for managing:
 * - Games (/api/games)
 * - Teams (/api/teams)
 * - Players (/api/players)
 */
export function registerNexusTeamsModule(app: Express): void {
  attachNexusTeamsRoutes(app);
}

export { attachNexusTeamsRoutes } from './routes';
export * from './service';
