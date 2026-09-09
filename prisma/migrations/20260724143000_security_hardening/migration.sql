-- AUD-006: rate limit compartilhado entre todas as instâncias da aplicação.
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- AUD-009: reserva documentos sem apagar contas legadas que já estejam duplicadas.
CREATE TABLE IF NOT EXISTS "RegistrationDocument" (
    "cnpjCpf" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationDocument_pkey" PRIMARY KEY ("cnpjCpf")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationDocument_empresaId_key"
ON "RegistrationDocument"("empresaId");

INSERT INTO "RegistrationDocument" ("cnpjCpf", "empresaId", "createdAt")
SELECT DISTINCT ON ("cnpjCpf") "cnpjCpf", "id", CURRENT_TIMESTAMP
FROM "Adega"
WHERE "cnpjCpf" IS NOT NULL
ORDER BY "cnpjCpf", "createdAt" ASC
ON CONFLICT ("cnpjCpf") DO NOTHING;
