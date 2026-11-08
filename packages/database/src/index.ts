import { PrismaClient } from '@prisma/client';

declare global {
  var prismaClientGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaClientGlobal || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaClientGlobal = prisma;
}

export * from '@prisma/client';
