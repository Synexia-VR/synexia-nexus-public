import bcrypt from "bcryptjs";
import { signAuthToken } from "./jwt";
import { createRefreshTokenForUser } from "./refreshToken";
import prisma from "../../db/client";

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthUser;
}

const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

function normalizePassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const pw = value.trim();
  return pw.length > 0 ? pw : null;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const email = normalizeEmail((input as any).email);
  const password = normalizePassword((input as any).password);
  const displayName =
    typeof (input as any).displayName === "string"
      ? (input as any).displayName.trim()
      : undefined;

  if (!email || !password) {
    throw new Error("email_and_password_required");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error("password_too_short");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("email_already_in_use");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName && displayName.length > 0 ? displayName : null,
    },
  });

  const accessToken = signAuthToken({ userId: user.id });
  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } =
    await createRefreshTokenForUser(user.id);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const email = normalizeEmail((input as any).email);
  const password = normalizePassword((input as any).password);

  if (!email || !password) {
    throw new Error("email_and_password_required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("invalid_credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("invalid_credentials");
  }

  const accessToken = signAuthToken({ userId: user.id });
  const { token: refreshToken, expiresAt: refreshTokenExpiresAt } =
    await createRefreshTokenForUser(user.id);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}

export async function getUserById(
  userId: string
): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true },
  });
  return user;
}
