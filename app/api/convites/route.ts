import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { sendUserInvite } from "@/lib/email";
import { getEmpresaById, getFilialById, getUserByEmail } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { recordTenantAudit } from "@/lib/tenant-audit";
import { createUserInviteToken } from "@/lib/user-invite";
import { firstZodError, userInviteCreateSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const owner = await requireApiUser();
  if (owner.role !== "OWNER") return NextResponse.json({ error: "Somente o Dono pode convidar usuários." }, { status: 403 });
  const limit = await rateLimit(`user-invite:${owner.empresaId}:${owner.userId}`, 10, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Muitos convites enviados. Aguarde antes de tentar novamente." }, { status: 429 });
  const parsed = userInviteCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  const { email, role, filialId } = parsed.data;
  const [existing, filial, empresa] = await Promise.all([getUserByEmail(email), getFilialById(filialId, owner.empresaId), getEmpresaById(owner.empresaId)]);
  if (existing) return NextResponse.json({ error: "Este e-mail já possui acesso ao sistema." }, { status: 409 });
  if (!filial?.approved) return NextResponse.json({ error: "Selecione uma filial ativa." }, { status: 400 });
  const generated = createUserInviteToken();
  await prisma.$transaction(async (tx) => {
    await tx.userInvite.deleteMany({ where: { empresaId: owner.empresaId, email, acceptedAt: null } });
    await tx.userInvite.create({ data: { empresaId: owner.empresaId, filialId, email, role, tokenHash: generated.tokenHash, invitedByUserId: owner.userId, invitedByName: owner.name, expiresAt: generated.expiresAt } });
  });
  await sendUserInvite({ email, token: generated.token, tokenHash: generated.tokenHash, empresaName: empresa?.name ?? owner.empresaName, inviterName: owner.name });
  await recordTenantAudit({ user: owner, action: "USER_INVITED", entityType: "UserInvite", details: { email, role, filialId } });
  return NextResponse.json({ ok: true });
});
