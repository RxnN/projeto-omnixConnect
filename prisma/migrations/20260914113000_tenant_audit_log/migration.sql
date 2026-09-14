CREATE TABLE "TenantAuditLog" (
    "id" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "filialId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantAuditLog_adegaId_createdAt_idx" ON "TenantAuditLog"("adegaId", "createdAt");
CREATE INDEX "TenantAuditLog_userId_createdAt_idx" ON "TenantAuditLog"("userId", "createdAt");

ALTER TABLE "TenantAuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_audit_select ON "TenantAuditLog"
FOR SELECT USING ("adegaId" = public.app_context_value('tenant'));

CREATE POLICY rls_tenant_audit_insert ON "TenantAuditLog"
FOR INSERT WITH CHECK ("adegaId" = public.app_context_value('tenant'));

REVOKE ALL ON TABLE "TenantAuditLog" FROM PUBLIC;
