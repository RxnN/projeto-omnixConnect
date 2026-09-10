ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PasswordResetToken_userId_key"
ON "PasswordResetToken"("userId");

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_adegaId_idx"
ON "PasswordResetToken"("adegaId");

ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant ON "PasswordResetToken"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

CREATE POLICY rls_reset_token ON "PasswordResetToken"
FOR SELECT
USING ("tokenHash" = public.app_context_value('reset'));

REVOKE ALL ON TABLE "PasswordResetToken" FROM PUBLIC;
