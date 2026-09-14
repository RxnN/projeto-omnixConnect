import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { getSession } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LOGIN_MFA_MAX_ATTEMPTS, verifyLoginMfaCode } from "@/lib/login-mfa";
import { alertSecurityEvent, countSecurityEvent } from "@/lib/security-monitoring";
import { getEmpresaById, getUserByEmail } from "@/lib/repo";
import { runWithDatabaseContext } from "@/lib/prisma";
import { createTrackedSession } from "@/lib/user-session";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const limit = await rateLimit(`owner-login-mfa-verify:${clientIp(req)}`, 10, 10 * 60_000);
  if (!limit.allowed) {
    alertSecurityEvent("login_mfa_verify_limited");
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Digite o código de 6 números." }, { status: 400 });
  }

  const session = await getSession();
  const challenge = session.loginMfa;
  if (!challenge || challenge.expiresAt < Date.now()) {
    session.loginMfa = undefined;
    await session.save();
    return NextResponse.json({ error: "Código expirado. Volte ao login e tente novamente." }, { status: 400 });
  }
  if (challenge.attempts >= LOGIN_MFA_MAX_ATTEMPTS) {
    session.loginMfa = undefined;
    await session.save();
    return NextResponse.json({ error: "Limite de tentativas atingido. Volte ao login." }, { status: 429 });
  }
  if (!verifyLoginMfaCode(code, challenge.codeHash)) {
    countSecurityEvent("login_mfa_invalid");
    session.loginMfa = { ...challenge, attempts: challenge.attempts + 1 };
    await session.save();
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const user = await runWithDatabaseContext("login", challenge.email, () => getUserByEmail(challenge.email));
  if (
    !user ||
    user.id !== challenge.userId ||
    user.empresaId !== challenge.empresaId ||
    user.role !== "OWNER" ||
    !user.emailVerifiedAt ||
    user.sessionVersion !== challenge.sessionVersion
  ) {
    session.loginMfa = undefined;
    await session.save();
    return NextResponse.json({ error: "O acesso mudou. Entre novamente." }, { status: 401 });
  }

  const empresa = await runWithDatabaseContext("tenant", user.empresaId, () => getEmpresaById(user.empresaId));
  if (!empresa) {
    session.loginMfa = undefined;
    await session.save();
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 401 });
  }

  const trackedSessionId = await runWithDatabaseContext("tenant", user.empresaId, () =>
    createTrackedSession(user.id, user.empresaId, req),
  );

  session.user = {
    userId: user.id,
    empresaId: user.empresaId,
    empresaName: empresa.name,
    filialId: user.filialId,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    sessionId: trackedSessionId,
    lastActivityAt: Date.now(),
  };
  session.loginMfa = undefined;
  session.adminMfa = undefined;
  await session.save();
  return NextResponse.json({ ok: true });
});
