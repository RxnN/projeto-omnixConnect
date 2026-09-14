import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const GET = withErrorHandling(async () => {
  const user = await requireApiUser();
  if (user.role !== "OWNER") return NextResponse.json({ error: "Somente o Dono pode exportar os dados." }, { status: 403 });

  const [empresa, filiais, users, products, pedidos, movements, promotions, audit] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: user.empresaId } }),
    prisma.filial.findMany({ where: { empresaId: user.empresaId } }),
    prisma.user.findMany({ where: { empresaId: user.empresaId }, select: { id: true, filialId: true, name: true, phone: true, email: true, emailVerifiedAt: true, role: true, permissions: true, createdAt: true } }),
    prisma.product.findMany({ where: { empresaId: user.empresaId } }),
    prisma.pedido.findMany({ where: { empresaId: user.empresaId } }),
    prisma.movement.findMany({ where: { empresaId: user.empresaId } }),
    prisma.promotion.findMany({ where: { empresaId: user.empresaId } }),
    prisma.tenantAuditLog.findMany({ where: { empresaId: user.empresaId } }),
  ]);
  const exportedAt = new Date().toISOString();
  return new NextResponse(JSON.stringify({ exportedAt, empresa, filiais, users, products, pedidos, movements, promotions, audit }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="omnix-dados-${exportedAt.slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
});
