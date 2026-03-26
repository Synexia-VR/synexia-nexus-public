import crypto from "crypto";
import prisma from "../../db/client";

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface RefreshTokenResult {
  token: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

export async function createRefreshTokenForUser(
  userId: string
): Promise<RefreshTokenResult> {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function verifyAndRotateRefreshToken(
  token: string
): Promise<{ userId: string; newToken: string; newExpiresAt: Date } | null> {
  const tokenHash = hashToken(token);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existingToken) {
    return null;
  }

  if (existingToken.revokedAt) {
    return null;
  }

  if (existingToken.expiresAt < new Date()) {
    return null;
  }

  const newToken = generateRefreshToken();
  const newTokenHash = hashToken(newToken);
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const newRefreshToken = await prisma.refreshToken.create({
    data: {
      userId: existingToken.userId,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    },
  });

  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: {
      revokedAt: new Date(),
      replacedByTokenId: newRefreshToken.id,
    },
  });

  return {
    userId: existingToken.userId,
    newToken,
    newExpiresAt,
  };
}

export async function revokeRefreshToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existingToken || existingToken.revokedAt) {
    return false;
  }

  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: { revokedAt: new Date() },
  });

  return true;
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export interface SessionInfo {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export async function getActiveSessionsForUser(userId: string): Promise<SessionInfo[]> {
  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions;
}

export async function revokeSessionById(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const session = await prisma.refreshToken.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
  });

  if (!session) {
    return false;
  }

  await prisma.refreshToken.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  return true;
}
