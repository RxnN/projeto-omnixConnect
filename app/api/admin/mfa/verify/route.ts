import { NextRequest, NextResponse } from "next/server";
import { getAdminPath } from "@/lib/admin-path";
import { requireSuperAdminIdentityApi } from "@/lib/admin-access";
import { ADMIN_MFA_MAX_ATTEMPTS, verifyAdminMfaCode } from "@/lib/admin-mfa";
import { withErrorHandling } from "@/lib/api-handler";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { recordAdminAudit } from "@/lib/admin-audit";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = await requireSuperAdminIdentityApi();
  const limit = await rateLimit(`admin-mfa-verify:${admin.email}:${clientIp(req)}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Digite o código de 6 números." }, { status: 400 });

  const session = await getSession();
  const challenge = session.adminMfa;
  if (!challenge?.codeHash || !challenge.expiresAt || challenge.expiresAt < Date.now()) {
    session.adminMfa = undefined;
    await session.save();
    return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 });
  }
  const attempts = challenge.attempts ?? 0;
  if (attempts >= ADMIN_MFA_MAX_ATTEMPTS) {
    session.adminMfa = undefined;
    await session.save();
    return NextResponse.json({ error: "Limite de tentativas atingido. Solicite um novo código." }, { status: 429 });
  }
  if (!verifyAdminMfaCode(code, challenge.codeHash)) {
    session.adminMfa = { ...challenge, attempts: attempts + 1 };
    await session.save();
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  await recordAdminAudit({ action: "ADMIN_MFA_VERIFIED", adminEmail: admin.email });
  session.adminMfa = { verifiedAt: Date.now() };
  await session.save();
  return NextResponse.json({ ok: true, adminPath: getAdminPath() });
});
