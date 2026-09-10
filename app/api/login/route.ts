import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import bcrypt from "bcryptjs";
import { getUserByEmail, getEmpresaById } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";
import { loginSchema, firstZodError } from "@/lib/validation";
import { verifyTurnstile } from "@/lib/turnstile";
import { runWithDatabaseContext } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/admin-access";
import { getAdminPath } from "@/lib/admin-path";
import { alertSecurityEvent } from "@/lib/security-monitoring";

// Hash "morto" só pra igualar o tempo de resposta quando o e-mail nem existe
// (evita que alguém descubra e-mails cadastrados medindo o tempo da resposta).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Ry6yGxHhI9zJXTuGGWVCsHV5r2Z3W";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Limite por IP: barra flood genérico no endpoint. Mas o header X-Forwarded-For vem
  // do próprio cliente e pode ser forjado sem um proxy confiável na frente — por isso
  // o limite por e-mail abaixo é o que realmente impede força bruta numa conta específica.
  const ipLimit = await rateLimit(`login-ip:${clientIp(req)}`, 20, 5 * 60_000);
  if (!ipLimit.allowed) {
    alertSecurityEvent("login_ip_limited");
    return NextResponse.json(
      { error: "Muitas tentativas de login. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { email, password, turnstileToken } = parsed.data;

  await verifyTurnstile(turnstileToken, clientIp(req));

  const emailLimit = await rateLimit(`login-email:${email}`, 8, 15 * 60_000);
  if (!emailLimit.allowed) {
    alertSecurityEvent("login_email_limited");
    return NextResponse.json(
      { error: "Muitas tentativas para este e-mail. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } }
    );
  }

  const user = await runWithDatabaseContext("login", email, () => getUserByEmail(email));
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    // Sem e-mail nos atributos — a métrica é só pra acompanhar volume/tendência de
    // tentativas inválidas, não pra identificar quem tentou.
    Sentry.metrics.count("login_failed", 1);
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Confirme seu e-mail antes de entrar. Use o link enviado no cadastro." },
      { status: 403 },
    );
  }

  const empresa = await runWithDatabaseContext("tenant", user.empresaId, () => getEmpresaById(user.empresaId));

  const session = await getSession();
  session.user = {
    userId: user.id,
    empresaId: user.empresaId,
    empresaName: empresa?.name ?? "Empresa",
    filialId: user.filialId,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    lastActivityAt: Date.now(),
  };
  await session.save();

  const isAdmin = isSuperAdminEmail(user.email);
  if (isAdmin) session.adminMfa = undefined;
  await session.save();
  return NextResponse.json({
    ok: true,
    role: user.role,
    admin: isAdmin,
    ...(isAdmin ? { adminPath: getAdminPath() } : {}),
  });
});
