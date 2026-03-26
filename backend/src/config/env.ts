import dotenv from 'dotenv';

dotenv.config();

export interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  CORS_ORIGIN: string;
}

export function getEnv(): EnvConfig {
  const DATABASE_URL = process.env.DATABASE_URL;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!JWT_SECRET) {
    console.error('ERROR: JWT_SECRET environment variable is required');
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL,
    JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  };
}
