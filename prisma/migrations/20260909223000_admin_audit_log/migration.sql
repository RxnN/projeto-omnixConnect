CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "empresaId" TEXT,
    "empresaName" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_empresaId_createdAt_idx" ON "AdminAuditLog"("empresaId", "createdAt");

ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_admin_select ON "AdminAuditLog"
FOR SELECT USING (public.app_context_value('admin') IS NOT NULL);

CREATE POLICY rls_admin_insert ON "AdminAuditLog"
FOR INSERT WITH CHECK (
  public.app_context_value('admin') IS NOT NULL
  AND LOWER("adminEmail") = LOWER(public.app_context_value('admin'))
);

REVOKE ALL ON TABLE "AdminAuditLog" FROM PUBLIC;
