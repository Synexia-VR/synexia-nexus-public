import type { Request, Response, NextFunction } from "express";
import { z, ZodSchema, ZodError } from "zod";

export function parseBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({ error: "validation_error", details });
    }
    req.body = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().max(64, "Display name too long").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const createPlayerSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID format"),
  nickname: z.string().trim().min(1, "Nickname is required").max(32, "Nickname too long"),
});

export const createPlayerBodySchema = z.object({
  nickname: z.string().trim().min(1, "Nickname is required").max(32, "Nickname too long"),
});

export const addToRosterSchema = z.object({
  playerId: z.string().uuid("Invalid player ID format"),
});
