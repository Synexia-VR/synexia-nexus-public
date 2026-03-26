import type { Express, Request, Response, RequestHandler } from "express";
import { listMyOrganizations } from "./service";
import { asyncHandler } from "../../middleware/asyncHandler";
import { notFound } from "../../errors/AppError";
import { requireAuth } from "../auth/routes";
import {
  getActiveSessionsForUser,
  revokeSessionById,
} from "../auth/refreshToken";
import { mutationLimiter } from "../../middleware/rateLimit";

export function attachMeRoutes(app: Express): void {
  app.get("/api/me/organizations", async (req: Request, res: Response) => {
    try {
      const auth = req.auth;
      if (!auth || !auth.userId) {
        return res.status(401).json({ error: "unauthorized", requestId: req.requestId });
      }

      const organizations = await listMyOrganizations(auth.userId);
      res.json({ organizations });
    } catch (err) {
      console.error("Error in GET /api/me/organizations", err);
      res.status(500).json({ error: "internal_error", requestId: req.requestId });
    }
  });

  app.get(
    "/api/me/sessions",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const sessions = await getActiveSessionsForUser(userId);
      res.json({ sessions });
    })
  );

  app.post(
    "/api/me/sessions/:sessionId/revoke",
    requireAuth,
    mutationLimiter as any,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const { sessionId } = req.params;

      const revoked = await revokeSessionById(sessionId, userId);
      if (!revoked) {
        throw notFound("session_not_found");
      }

      res.status(204).send();
    })
  );
}
