import { PrismaClient } from "@prisma/client";

const adminUrl = process.env.DATABASE_ADMIN_URL;

if (!adminUrl) {
  throw new Error("DATABASE_ADMIN_URL não configurada. Esta conexão é exclusiva para scripts administrativos.");
}

export const adminPrisma = new PrismaClient({ datasourceUrl: adminUrl });
