import type { Request, Response, NextFunction } from "express";
import { isUserMemberOfOrg } from "../modules/nexus-teams/permissions";
import { badRequest, unauthorized, forbidden } from "../errors/AppError";

declare global {
  namespace Express {
    interface Request {
      orgId?: string;
    }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireOrgIdFromParams(paramName: string = "organizationId") {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (typeof value !== "string" || !value.trim()) {
      return next(badRequest("organizationId_required"));
    }
    const trimmed = value.trim();
    if (!UUID_REGEX.test(trimmed)) {
      return next(badRequest("organizationId_invalid"));
    }
    req.orgId = trimmed;
    next();
  };
}

export function requireOrgIdFromQuery(paramName: string = "organizationId") {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.query[paramName];
    if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: "organizationId_required" });
    }
    req.orgId = value.trim();
    next();
  };
}

export function requireOrgIdFromBody(paramName: string = "organizationId") {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body?.[paramName];
    if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: "organizationId_required" });
    }
    req.orgId = value.trim();
    next();
  };
}

export function requireOrgMembership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth?.userId;
    const orgId = req.orgId;

    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!orgId) {
      return res.status(400).json({ error: "organizationId_required" });
    }

    const isMember = await isUserMemberOfOrg(userId, orgId);
    if (!isMember) {
      return res.status(403).json({ error: "forbidden" });
    }

    next();
  };
}

export function requireOrgPermission(
  checkFn: (userId: string, orgId: string) => Promise<boolean>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth?.userId;
    const orgId = req.orgId;

    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!orgId) {
      return res.status(400).json({ error: "organizationId_required" });
    }

    const allowed = await checkFn(userId, orgId);
    if (!allowed) {
      return res.status(403).json({ error: "forbidden" });
    }

    next();
  };
}
