import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../logger";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    const response: { error: string; details?: any; requestId?: string } = {
      error: err.code,
      requestId,
    };
    if (err.details !== undefined) {
      response.details = err.details;
    }
    return res.status(err.status).json(response);
  }

  logger.error(
    {
      requestId,
      err: {
        message: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      },
    },
    "Unhandled error"
  );

  return res.status(500).json({ error: "internal_error", requestId });
};
