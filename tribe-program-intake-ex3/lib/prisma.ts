import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// The prisma-client generator emits no package-root index; client.ts is the
// documented main entry point ("This file should be your main import").
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
