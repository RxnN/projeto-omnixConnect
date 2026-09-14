import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { ApiError, withErrorHandling } from "@/lib/api-handler";
import { runWithDatabaseContext, prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createUser } from "@/lib/repo";
import { verifyTurnstile } from "@/lib/turnstile";
import { hashUserInviteToken } from "@/lib/user-invite";
import { firstZodError, userInviteAcceptSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const ip = clientIp(req);
  const limit = await rateLimit(`user-invite-accept:${ip}`, 10, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const parsed = userInviteAcceptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  await verifyTurnstile(parsed.data.turnstileToken, ip);
  const tokenHash = hashUserInviteToken(parsed.data.token);
  const invite = await runWithDatabaseContext("invite", tokenHash, () => prisma.userInvite.findUnique({ where: { tokenHash } }));
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 400 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await runWithDatabaseContext("tenant", invite.empresaId, () => prisma.$transaction(async (tx) => {
    const claimed = await tx.userInvite.updateMany({ where: { id: invite.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
    if (claimed.count !== 1) throw new ApiError(409, "Este convite já foi utilizado.");
    const existing = await tx.user.findUnique({ where: { email: invite.email } });
    if (existing) throw new ApiError(409, "Este e-mail já possui acesso.");
    const user = await createUser({ empresaId: invite.empresaId, filialId: invite.filialId, name: parsed.data.name, phone: parsed.data.phone, email: invite.email, passwordHash, role: invite.role });
    await tx.tenantAuditLog.create({ data: { empresaId: invite.empresaId, userId: user.id, userName: user.name, action: "USER_INVITE_ACCEPTED", entityType: "User", entityId: user.id, filialId: invite.filialId, details: { role: invite.role } } });
  }));
  return NextResponse.json({ ok: true });
});
