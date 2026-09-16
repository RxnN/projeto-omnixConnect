import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEffectivePermissions, requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";
import { setEntryPaymentPaid } from "@/lib/repo";
import { recordTenantAudit } from "@/lib/tenant-audit";

const schema = z.object({ paid: z.boolean() });

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request: NextRequest, { params }) => {
  const user = await requireApiUser();
  if (!(await getEffectivePermissions(user)).VIEW_COSTS_MARGIN) return NextResponse.json({ error: "Você não tem permissão para gerenciar pagamentos." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const filialId = await getCurrentFilialId(user);
  const { id } = await params;
  const payment = await setEntryPaymentPaid(id, filialId, parsed.data.paid);
  if (!payment) return NextResponse.json({ error: "Boleto de entrada não encontrado." }, { status: 404 });
  await recordTenantAudit({ user, action: "ENTRY_PAYMENT_STATUS_CHANGED", entityType: "Pedido", entityId: id, filialId, details: { paid: parsed.data.paid, number: payment.number } });
  return NextResponse.json({ ok: true, payment });
});
