-- Confirmação de e-mail: contas já aprovadas são tratadas como verificadas para
-- preservar o acesso existente. Contas pendentes precisarão confirmar o endereço.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User" AS u
SET "emailVerifiedAt" = COALESCE(u."emailVerifiedAt", u."createdAt")
FROM "Adega" AS a
WHERE a."id" = u."adegaId"
  AND a."approved" = TRUE
  AND u."emailVerifiedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmailVerificationToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_userId_key"
ON "EmailVerificationToken"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key"
ON "EmailVerificationToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_adegaId_idx"
ON "EmailVerificationToken"("adegaId");

-- A assinatura do contexto impede que uma credencial SQL isolada escolha livremente
-- outro tenant apenas alterando um parâmetro de sessão. O segredo fica em schema privado.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app_private.rls_secrets (
    id TEXT PRIMARY KEY,
    secret TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
REVOKE ALL ON app_private.rls_secrets FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.app_context_value(expected_kind TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
    context_kind TEXT;
    context_value TEXT;
    supplied_signature TEXT;
    stored_secret TEXT;
    expected_signature TEXT;
BEGIN
    context_kind := current_setting('app.context_kind', TRUE);
    context_value := current_setting('app.context_value', TRUE);
    supplied_signature := current_setting('app.context_signature', TRUE);

    IF context_kind IS DISTINCT FROM expected_kind
       OR context_value IS NULL OR context_value = ''
       OR supplied_signature IS NULL OR supplied_signature = '' THEN
        RETURN NULL;
    END IF;

    SELECT s.secret INTO stored_secret
    FROM app_private.rls_secrets AS s
    WHERE s.id = 'primary';

    IF stored_secret IS NULL THEN
        RETURN NULL;
    END IF;

    expected_signature := encode(
      public.hmac(context_kind || ':' || context_value, stored_secret, 'sha256'),
      'hex'
    );

    IF expected_signature = supplied_signature THEN
        RETURN context_value;
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.app_context_value(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_context_value(TEXT) TO PUBLIC;

-- As políticas são criadas agora, mas RLS só será ativada pelo script de ativação
-- depois que o código compatível e o segredo assinado estiverem no deploy.
DROP POLICY IF EXISTS rls_tenant ON "Adega";
CREATE POLICY rls_tenant ON "Adega"
FOR ALL
USING ("id" = public.app_context_value('tenant'))
WITH CHECK ("id" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "Filial";
CREATE POLICY rls_tenant ON "Filial"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "Product";
CREATE POLICY rls_tenant ON "Product"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "Promotion";
CREATE POLICY rls_tenant ON "Promotion"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "Pedido";
CREATE POLICY rls_tenant ON "Pedido"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "Movement";
CREATE POLICY rls_tenant ON "Movement"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "RegistrationDocument";
CREATE POLICY rls_tenant ON "RegistrationDocument"
FOR ALL
USING ("empresaId" = public.app_context_value('tenant'))
WITH CHECK ("empresaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_tenant ON "EmailVerificationToken";
CREATE POLICY rls_tenant ON "EmailVerificationToken"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_verify_token ON "EmailVerificationToken";
CREATE POLICY rls_verify_token ON "EmailVerificationToken"
FOR SELECT
USING ("tokenHash" = public.app_context_value('verify'));

DROP POLICY IF EXISTS rls_tenant ON "User";
CREATE POLICY rls_tenant ON "User"
FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

DROP POLICY IF EXISTS rls_login_lookup ON "User";
CREATE POLICY rls_login_lookup ON "User"
FOR SELECT
USING (LOWER("email") = public.app_context_value('login'));

DROP POLICY IF EXISTS rls_tenant ON "Counter";
CREATE POLICY rls_tenant ON "Counter"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Filial" AS f
    WHERE f."id" = "Counter"."filialId"
      AND f."adegaId" = public.app_context_value('tenant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Filial" AS f
    WHERE f."id" = "Counter"."filialId"
      AND f."adegaId" = public.app_context_value('tenant')
  )
);

DROP POLICY IF EXISTS rls_rate_limit_service ON "RateLimitBucket";
CREATE POLICY rls_rate_limit_service ON "RateLimitBucket"
FOR ALL USING (TRUE) WITH CHECK (TRUE);
