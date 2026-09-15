import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEffectivePermissions, requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { getSupplierById, setSupplierActive } from "@/lib/repo";
import { recordTenantAudit } from "@/lib/tenant-audit";

const schema = z.object({ active: z.boolean() });

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request: NextRequest, { params }) => {
  const user = await requireApiUser();
  if (!(await getEffectivePermissions(user)).REGISTER_ENTRIES) return NextResponse.json({ error: "Você não tem permissão para alterar fornecedores." }, { status: 403 });
  const { id } = await params;
  const existing = await getSupplierById(id, user.empresaId);
  if (!existing) return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const supplier = await setSupplierActive(id, user.empresaId, parsed.data.active);
  await recordTenantAudit({ user, action: "SUPPLIER_STATUS_CHANGED", entityType: "Supplier", entityId: id, details: { name: existing.name, active: parsed.data.active } });
  return NextResponse.json({ ok: true, supplier });
});
