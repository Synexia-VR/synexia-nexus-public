import pinoHttp from "pino-http";
import { Request } from "express";
import { logger } from "../logger";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).requestId || "unknown",
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  customProps: (req) => ({
    requestId: (req as Request).requestId,
  }),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
});
