CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "invitedByName" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");
CREATE INDEX "UserInvite_adegaId_createdAt_idx" ON "UserInvite"("adegaId", "createdAt");
CREATE INDEX "UserInvite_adegaId_email_idx" ON "UserInvite"("adegaId", "email");
ALTER TABLE "UserInvite" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_invite_tenant ON "UserInvite" FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));
CREATE POLICY rls_user_invite_token ON "UserInvite" FOR SELECT
USING ("tokenHash" = public.app_context_value('invite'));
REVOKE ALL ON TABLE "UserInvite" FROM PUBLIC;
