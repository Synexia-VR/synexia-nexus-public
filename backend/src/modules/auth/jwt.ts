import jwt from "jsonwebtoken";
import { AUTH_JWT_SECRET, AUTH_JWT_EXPIRES_IN } from "./config";

export interface AuthTokenPayload {
  userId: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, AUTH_JWT_SECRET, {
    expiresIn: AUTH_JWT_EXPIRES_IN,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_JWT_SECRET) as AuthTokenPayload;
    if (!decoded || typeof decoded.userId !== "string") {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}
