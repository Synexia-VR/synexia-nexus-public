import { Express, Request, Response, Router } from "express";
import { requireAuth } from "../auth";
import { getOrganizationsForUser, createOrganizationForUser } from "./service";

interface ModuleInfo {
  code: string;
  name: string;
}

export function attachCoreRoutes(app: Express, basePath: string): void {
  const coreRouter = Router();
  const orgRouter = Router();

  // ==========================================================================
  // CORE ROUTES (/api/core)
  // ==========================================================================
  coreRouter.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "core-ok" });
  });

  coreRouter.get("/modules", (_req: Request, res: Response) => {
    const modules: ModuleInfo[] = [{ code: "teams", name: "Nexus Teams" }];
    res.json(modules);
  });

  // ==========================================================================
  // ORGANIZATION ROUTES (/api/organizations) - PRIVATE
  // ==========================================================================
  orgRouter.use(requireAuth);

  // ✅ Devuelve SOLO las orgs del usuario logueado
  orgRouter.get("/", async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;
      const organizations = await getOrganizationsForUser(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error listing organizations:", error);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // ✅ Crea org + membership OWNER del creador
  orgRouter.post("/", async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;
      const { name, slug, timezone, planTier, primaryColor, secondaryColor } =
        req.body ?? {};

      if (!name || typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "name_required" });
      }

      const organization = await createOrganizationForUser(userId, {
        name: name.trim(),
        slug,
        timezone,
        planTier,
        primaryColor,
        secondaryColor,
      });

      res.status(201).json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.use(basePath, coreRouter);
  app.use("/api/organizations", orgRouter);
}
