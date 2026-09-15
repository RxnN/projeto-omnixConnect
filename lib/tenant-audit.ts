import * as Sentry from "@sentry/nextjs";
import type { Prisma } from "@prisma/client";
import type { SessionData } from "./session";
import { prisma } from "./prisma";

export type TenantAuditAction =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_STATUS_CHANGED"
  | "PRODUCTS_IMPORTED"
  | "ORDER_CREATED"
  | "ORDER_CANCELLED"
  | "PROMOTION_CREATED"
  | "PROMOTION_DELETED"
  | "BRANCH_CREATED"
  | "BRANCH_REQUESTED"
  | "USER_PERMISSIONS_CHANGED"
  | "SESSION_REVOKED"
  | "OTHER_SESSIONS_REVOKED"
  | "USER_INVITED"
  | "USER_INVITE_ACCEPTED"
  | "DATA_DELETION_REQUESTED"
  | "SUPPLIER_CREATED"
  | "SUPPLIER_UPDATED"
  | "SUPPLIER_STATUS_CHANGED";

export async function recordTenantAudit(input: {
  user: SessionData;
  action: TenantAuditAction;
  entityType: string;
  entityId?: string | null;
  filialId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.tenantAuditLog.create({
      data: {
        empresaId: input.user.empresaId,
        userId: input.user.userId,
        userName: input.user.name,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        filialId: input.filialId ?? null,
        details: input.details,
      },
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "tenant-audit", action: input.action } });
    console.error("[tenant-audit] falha ao registrar ação", input.action, error);
  }
}

export async function listTenantAudit(empresaId: string, limit = 100) {
  return prisma.tenantAuditLog.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}
