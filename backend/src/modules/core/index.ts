import { Express } from 'express';
import { attachCoreRoutes } from './routes';

export function registerCoreModule(app: Express): void {
  attachCoreRoutes(app, '/api/core');
}

export * from './service';
