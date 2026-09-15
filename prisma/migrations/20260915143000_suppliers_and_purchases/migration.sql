CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "adegaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpjCpf" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Pedido" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "invoiceNumber" TEXT;

CREATE INDEX "Supplier_adegaId_active_name_idx" ON "Supplier"("adegaId", "active", "name");
CREATE UNIQUE INDEX "Supplier_adegaId_cnpjCpf_key" ON "Supplier"("adegaId", "cnpjCpf");
CREATE INDEX "Pedido_supplierId_createdAt_idx" ON "Pedido"("supplierId", "createdAt");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_adegaId_fkey"
FOREIGN KEY ("adegaId") REFERENCES "Adega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant ON "Supplier" FOR ALL
USING ("adegaId" = public.app_context_value('tenant'))
WITH CHECK ("adegaId" = public.app_context_value('tenant'));

REVOKE ALL ON TABLE "Supplier" FROM PUBLIC;
