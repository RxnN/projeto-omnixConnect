import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { recordTenantAudit } from "@/lib/tenant-audit";
import { revokeUserSession } from "@/lib/user-session";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  if (id === user.sessionId) return NextResponse.json({ error: "Use o botão Sair para encerrar este dispositivo." }, { status: 400 });
  const result = await revokeUserSession(id, user.userId, user.empresaId);
  if (result.count !== 1) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
  await recordTenantAudit({ user, action: "SESSION_REVOKED", entityType: "UserSession", entityId: id });
  return NextResponse.json({ ok: true });
});
