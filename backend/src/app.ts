import express, { Express, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env";
import { registerAuthModule } from "./modules/auth";
import { registerCoreModule } from "./modules/core";
import { registerMeModule } from "./modules/me";
import { registerNexusTeamsModule } from "./modules/nexus-teams";
import { errorHandler } from "./middleware/errorHandler";
import { requestIdMiddleware } from "./middleware/requestId";
import { httpLogger } from "./middleware/httpLogger";

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(httpLogger);

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  registerAuthModule(app);
  registerCoreModule(app);
  registerMeModule(app);
  registerNexusTeamsModule(app);

  app.use(errorHandler);

  return app;
}

export default createApp;
