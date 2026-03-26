import type { Express } from "express";
import { attachMeRoutes } from "./routes";

export function registerMeModule(app: Express): void {
  attachMeRoutes(app);
}
