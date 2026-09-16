ALTER TABLE "Pedido" ADD COLUMN "paymentDueAt" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN "paymentPaidAt" TIMESTAMP(3);

-- Entradas anteriores a este módulo não podem virar dívidas retroativas. Elas começam
-- como quitadas; somente boletos criados após o deploy nascerão pendentes.
UPDATE "Pedido"
SET
  "paymentDueAt" = CASE
    WHEN "type" = 'IN' AND "paymentMethod" = 'BOLETO' AND "boletoDueDays" IS NOT NULL
    THEN "createdAt" + ("boletoDueDays" * INTERVAL '1 day')
    ELSE NULL
  END,
  "paymentPaidAt" = CASE WHEN "type" = 'IN' THEN "createdAt" ELSE NULL END;

CREATE INDEX "Pedido_filialId_type_paymentPaidAt_paymentDueAt_idx"
ON "Pedido"("filialId", "type", "paymentPaidAt", "paymentDueAt");
