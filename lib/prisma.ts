import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __adegasPrisma?: PrismaClient };

export const prisma = globalForPrisma.__adegasPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__adegasPrisma = prisma;
}
