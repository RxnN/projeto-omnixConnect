import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { recordTenantAudit } from "@/lib/tenant-audit";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const owner = await requireApiUser();
  if (owner.role !== "OWNER") return NextResponse.json({ error: "Somente o Dono pode solicitar a exclusão da empresa." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation.trim() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (confirmation !== owner.empresaName) return NextResponse.json({ error: "Digite exatamente o nome da empresa para confirmar." }, { status: 400 });
  const pending = await prisma.dataDeletionRequest.findFirst({ where: { empresaId: owner.empresaId, status: "PENDING" } });
  if (pending) return NextResponse.json({ error: "Já existe uma solicitação aguardando análise." }, { status: 409 });
  const request = await prisma.dataDeletionRequest.create({ data: { empresaId: owner.empresaId, empresaName: owner.empresaName, userId: owner.userId, userName: owner.name, reason: reason || null } });
  await recordTenantAudit({ user: owner, action: "DATA_DELETION_REQUESTED", entityType: "DataDeletionRequest", entityId: request.id });
  return NextResponse.json({ ok: true });
});
