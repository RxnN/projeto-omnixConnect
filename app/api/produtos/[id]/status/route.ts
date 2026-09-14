import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission, requireApiUser } from "@/lib/auth";
import { getProductById, setProductActive } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";
import { recordTenantAudit } from "@/lib/tenant-audit";

const statusSchema = z.object({ active: z.boolean() });

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (req: NextRequest, { params }) => {
  const { id } = await params;
  const user = await requireApiUser();
  if (!(await hasPermission(user, "MANAGE_PRODUCTS"))) {
    return NextResponse.json({ error: "Você não tem permissão para alterar o status de produtos." }, { status: 403 });
  }

  const filialId = await getCurrentFilialId(user);
  const existing = await getProductById(id, filialId);
  if (!existing) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const product = await setProductActive(id, filialId, parsed.data.active);
  if (product) {
    await recordTenantAudit({ user, action: "PRODUCT_STATUS_CHANGED", entityType: "Product", entityId: id, filialId, details: { name: existing.name, previousActive: existing.active, active: product.active } });
  }
  return NextResponse.json({ ok: true, product });
});
