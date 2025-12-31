import { PrismaClient } from "@prisma/client";

export function getPrisma(): PrismaClient | null {
  if (process.env.ENABLE_DB !== "true") return null;
  if (process.env.NODE_ENV !== "production") {
    if (!(globalThis as any).prisma) {
      (globalThis as any).prisma = new PrismaClient();
    }
    return (globalThis as any).prisma;
  }
  return new PrismaClient();
}
