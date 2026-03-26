import type { Express } from "express";
import { attachAuthRoutes, authMiddleware, requireAuth } from "./routes";

export function registerAuthModule(app: Express): void {
  app.use(authMiddleware);
  attachAuthRoutes(app);
}

// para importarlo desde otros módulos: import { requireAuth } from "../auth";
export { requireAuth };
