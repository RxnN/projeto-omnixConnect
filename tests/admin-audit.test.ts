import { afterAll, describe, expect, it } from "vitest";
import { adminPrisma } from "@/lib/admin-prisma";
import { enterAdminDatabaseContext, prisma } from "@/lib/prisma";
import { listAdminAuditLogs, recordAdminAudit } from "@/lib/admin-audit";
import { activateAdminCompany } from "@/lib/admin-company";
import { runWithDatabaseContext } from "@/lib/prisma";
import { seedFixture } from "./helpers";

const auditIds: string[] = [];

afterAll(async () => {
  if (auditIds.length) await adminPrisma.adminAuditLog.deleteMany({ where: { id: { in: auditIds } } });
  await adminPrisma.$disconnect();
});

describe("histórico administrativo", () => {
  it("registra a ação, permite consulta e bloqueia alteração pela aplicação", async () => {
    enterAdminDatabaseContext("admin@example.com");
    const created = await recordAdminAudit({ action: "ADMIN_MFA_VERIFIED", adminEmail: "admin@example.com" });
    auditIds.push(created.id);

    const logs = await listAdminAuditLogs();
    expect(logs.some((entry) => entry.id === created.id)).toBe(true);
    await expect(
      prisma.adminAuditLog.update({ where: { id: created.id }, data: { adminEmail: "alterado@example.com" } }),
    ).rejects.toThrow();
    await expect(prisma.adminAuditLog.delete({ where: { id: created.id } })).rejects.toThrow();
  });

  it("grava a ativação da empresa na mesma operação", async () => {
    const { empresa, user } = await seedFixture();
    await runWithDatabaseContext("tenant", empresa.id, () =>
      prisma.$transaction(async (tx) => {
        await tx.empresa.update({ where: { id: empresa.id }, data: { approved: false, paidUntil: null } });
        await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      }),
    );
    enterAdminDatabaseContext("admin@example.com");
    await activateAdminCompany(empresa.id, 30, "admin@example.com");
    const entry = await prisma.adminAuditLog.findFirst({
      where: { empresaId: empresa.id, action: "COMPANY_ACTIVATED" },
      orderBy: { createdAt: "desc" },
    });
    expect(entry?.adminEmail).toBe("admin@example.com");
    expect(entry?.empresaName).toBe(empresa.name);
    expect(entry?.details).toMatchObject({ days: 30, previousApproved: false });
    if (entry) auditIds.push(entry.id);
  });
});
