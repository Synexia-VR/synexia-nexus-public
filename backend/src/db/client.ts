// src/db/client.ts
import { PrismaClient } from '@prisma/client';

// Usamos una variable global para reutilizar la instancia en desarrollo
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Creamos (o reutilizamos) la instancia de Prisma
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

// En desarrollo guardamos la instancia en global para no crear varias
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
