-- Mantém o painel rápido conforme catálogo e histórico de movimentações crescem.
CREATE INDEX IF NOT EXISTS "Product_filialId_active_name_idx"
ON "Product"("filialId", "active", "name");

CREATE INDEX IF NOT EXISTS "Movement_filialId_type_createdAt_idx"
ON "Movement"("filialId", "type", "createdAt");
