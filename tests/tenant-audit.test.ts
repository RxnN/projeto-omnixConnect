import { describe, expect, it } from "vitest";
import { enterTenantDatabaseContext, prisma, runWithDatabaseContext } from "@/lib/prisma";
import { listTenantAudit, recordTenantAudit } from "@/lib/tenant-audit";
import { seedFixture } from "./helpers";

describe("histórico da empresa", () => {
  it("isola empresas e impede alteração ou exclusão do registro", async () => {
    const first = await seedFixture();
    const second = await seedFixture();
    const sessionUser = {
      userId: first.user.id,
      empresaId: first.empresa.id,
      empresaName: first.empresa.name,
      filialId: null,
      name: first.user.name,
      email: first.user.email,
      role: "OWNER" as const,
      sessionVersion: 0,
      lastActivityAt: Date.now(),
    };

    await runWithDatabaseContext("tenant", first.empresa.id, () => recordTenantAudit({
      user: sessionUser,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: "produto-auditado",
    }));

    const own = await runWithDatabaseContext("tenant", first.empresa.id, () => listTenantAudit(first.empresa.id));
    const foreign = await runWithDatabaseContext("tenant", second.empresa.id, () => listTenantAudit(first.empresa.id));
    expect(own.some((entry) => entry.entityId === "produto-auditado")).toBe(true);
    expect(foreign).toHaveLength(0);

    enterTenantDatabaseContext(first.empresa.id);
    const entry = own.find((item) => item.entityId === "produto-auditado")!;
    await expect(prisma.tenantAuditLog.update({ where: { id: entry.id }, data: { action: "ALTERED" } })).rejects.toThrow();
    await expect(prisma.tenantAuditLog.delete({ where: { id: entry.id } })).rejects.toThrow();
  });
});
