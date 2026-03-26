import dotenv from "dotenv";

dotenv.config();

const envSecret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

if (!envSecret && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_JWT_SECRET or JWT_SECRET must be set in production");
}

if (!envSecret) {
  console.warn("Warning: AUTH_JWT_SECRET not set, using insecure dev fallback");
}

export const AUTH_JWT_SECRET = envSecret || "dev-secret-change-me";

export const AUTH_JWT_EXPIRES_IN = "15m";

export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
