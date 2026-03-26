import type { Express, Request, Response, NextFunction } from "express";
import { loginUser, registerUser, getUserById } from "./service";
import { verifyAuthToken, signAuthToken } from "./jwt";
import {
  verifyAndRotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from "./refreshToken";
import { loginLimiter, registerLimiter, refreshLimiter, mutationLimiter } from "../../middleware/rateLimit";
import { parseBody, registerSchema, loginSchema } from "../../utils/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  IS_PRODUCTION,
} from "./config";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/auth",
  });
}

export function attachAuthRoutes(app: Express): void {
  app.post(
    "/api/auth/register",
    registerLimiter as any,
    parseBody(registerSchema),
    async (req: Request, res: Response) => {
      try {
        const { email, password, displayName } = req.body;
        const result = await registerUser({ email, password, displayName });

        setRefreshTokenCookie(res, result.refreshToken);

        res.json({
          accessToken: result.accessToken,
          user: result.user,
        });
      } catch (err: any) {
        if (err instanceof Error) {
          if (err.message === "email_already_in_use") {
            return res.status(409).json({ error: "email_already_in_use" });
          }
        }
        console.error("register error", err);
        res.status(500).json({ error: "internal_error" });
      }
    }
  );

  app.post(
    "/api/auth/login",
    loginLimiter as any,
    parseBody(loginSchema),
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        const result = await loginUser({ email, password });

        setRefreshTokenCookie(res, result.refreshToken);

        res.json({
          accessToken: result.accessToken,
          user: result.user,
        });
      } catch (err: any) {
        if (err instanceof Error) {
          if (err.message === "invalid_credentials") {
            return res.status(401).json({ error: "invalid_credentials" });
          }
        }
        console.error("login error", err);
        res.status(500).json({ error: "internal_error" });
      }
    }
  );

  app.post(
    "/api/auth/refresh",
    refreshLimiter as any,
    async (req: Request, res: Response) => {
      try {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

        if (!refreshToken || typeof refreshToken !== "string") {
          return res.status(401).json({ error: "no_refresh_token" });
        }

        const result = await verifyAndRotateRefreshToken(refreshToken);

        if (!result) {
          clearRefreshTokenCookie(res);
          return res.status(401).json({ error: "invalid_refresh_token" });
        }

        const user = await getUserById(result.userId);
        if (!user) {
          clearRefreshTokenCookie(res);
          return res.status(401).json({ error: "user_not_found" });
        }

        const accessToken = signAuthToken({ userId: result.userId });
        setRefreshTokenCookie(res, result.newToken);

        res.json({
          accessToken,
          user,
        });
      } catch (err) {
        console.error("refresh error", err);
        res.status(500).json({ error: "internal_error" });
      }
    }
  );

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

      if (refreshToken && typeof refreshToken === "string") {
        await revokeRefreshToken(refreshToken);
      }

      clearRefreshTokenCookie(res);
      res.status(204).send();
    } catch (err) {
      console.error("logout error", err);
      clearRefreshTokenCookie(res);
      res.status(204).send();
    }
  });

  app.post(
    "/api/auth/logout-all",
    requireAuth,
    mutationLimiter as any,
    asyncHandler(async (req: Request, res: Response) => {
      await revokeAllUserRefreshTokens(req.auth!.userId);
      clearRefreshTokenCookie(res);
      res.status(204).send();
    })
  );
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string") {
    return next();
  }

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    res.status(401).json({ error: "invalid_authorization_header", requestId: req.requestId });
    return;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: "invalid_or_expired_token", requestId: req.requestId });
    return;
  }

  req.auth = {
    userId: payload.userId,
  };

  return next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth?.userId) {
    res.status(401).json({ error: "unauthorized", requestId: req.requestId });
    return;
  }
  next();
}
