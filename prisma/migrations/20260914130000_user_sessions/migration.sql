CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserSession_adegaId_lastSeenAt_idx" ON "UserSession"("adegaId", "lastSeenAt");
CREATE INDEX "UserSession_userId_lastSeenAt_idx" ON "UserSession"("userId", "lastSeenAt");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_session_select ON "UserSession" FOR SELECT
USING ("adegaId" = public.app_context_value('tenant') OR public.app_context_value('admin') IS NOT NULL);
CREATE POLICY rls_user_session_insert ON "UserSession" FOR INSERT
WITH CHECK ("adegaId" = public.app_context_value('tenant'));
CREATE POLICY rls_user_session_update ON "UserSession" FOR UPDATE
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));
REVOKE ALL ON TABLE "UserSession" FROM PUBLIC;
