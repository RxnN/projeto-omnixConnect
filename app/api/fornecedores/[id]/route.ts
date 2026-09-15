import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getEffectivePermissions, requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { getSupplierById, updateSupplier } from "@/lib/repo";
import { recordTenantAudit } from "@/lib/tenant-audit";
import { firstZodError, supplierSchema } from "@/lib/validation";

export const PUT = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request: NextRequest, { params }) => {
  const user = await requireApiUser();
  if (!(await getEffectivePermissions(user)).REGISTER_ENTRIES) return NextResponse.json({ error: "Você não tem permissão para editar fornecedores." }, { status: 403 });
  const { id } = await params;
  const existing = await getSupplierById(id, user.empresaId);
  if (!existing) return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
  const parsed = supplierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  try {
    const supplier = await updateSupplier(id, user.empresaId, parsed.data);
    await recordTenantAudit({ user, action: "SUPPLIER_UPDATED", entityType: "Supplier", entityId: id, details: { previousName: existing.name, name: supplier?.name } });
    return NextResponse.json({ ok: true, supplier });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Já existe um fornecedor com esse CPF ou CNPJ." }, { status: 409 });
    throw error;
  }
});
