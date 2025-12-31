import { PrismaClient } from "@prisma/client";

let _prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (process.env.NODE_ENV !== "production") {
    if (!(globalThis as any).prisma) {
      (globalThis as any).prisma = new PrismaClient();
    }
    return (globalThis as any).prisma;
  }
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}
