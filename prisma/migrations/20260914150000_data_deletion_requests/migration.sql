CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "empresaName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DataDeletionRequest_adegaId_createdAt_idx" ON "DataDeletionRequest"("adegaId", "createdAt");
CREATE INDEX "DataDeletionRequest_status_createdAt_idx" ON "DataDeletionRequest"("status", "createdAt");
ALTER TABLE "DataDeletionRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_deletion_tenant_select ON "DataDeletionRequest" FOR SELECT USING ("adegaId" = public.app_context_value('tenant'));
CREATE POLICY rls_deletion_tenant_insert ON "DataDeletionRequest" FOR INSERT WITH CHECK ("adegaId" = public.app_context_value('tenant'));
CREATE POLICY rls_deletion_admin_select ON "DataDeletionRequest" FOR SELECT USING (public.app_context_value('admin') IS NOT NULL);
CREATE POLICY rls_deletion_admin_update ON "DataDeletionRequest" FOR UPDATE USING (public.app_context_value('admin') IS NOT NULL) WITH CHECK (public.app_context_value('admin') IS NOT NULL);
REVOKE ALL ON TABLE "DataDeletionRequest" FROM PUBLIC;
