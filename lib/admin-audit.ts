import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AdminAuditAction = "ADMIN_MFA_VERIFIED" | "COMPANY_ACTIVATED" | "COMPANY_RENEWED";

export function recordAdminAudit(input: {
  action: AdminAuditAction;
  adminEmail: string;
  empresaId?: string;
  empresaName?: string;
  details?: Prisma.InputJsonValue;
}) {
  return prisma.adminAuditLog.create({
    data: {
      action: input.action,
      adminEmail: input.adminEmail.trim().toLowerCase(),
      empresaId: input.empresaId,
      empresaName: input.empresaName,
      details: input.details,
    },
  });
}

export function listAdminAuditLogs(limit = 50) {
  return prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}
