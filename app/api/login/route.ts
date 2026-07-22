import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, getAdegaById } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";
import { loginSchema, firstZodError } from "@/lib/validation";

// Hash "morto" só pra igualar o tempo de resposta quando o e-mail nem existe
// (evita que alguém descubra e-mails cadastrados medindo o tempo da resposta).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Ry6yGxHhI9zJXTuGGWVCsHV5r2Z3W";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Limite por IP: barra flood genérico no endpoint. Mas o header X-Forwarded-For vem
  // do próprio cliente e pode ser forjado sem um proxy confiável na frente — por isso
  // o limite por e-mail abaixo é o que realmente impede força bruta numa conta específica.
  const ipLimit = rateLimit(`login-ip:${clientIp(req)}`, 20, 5 * 60_000);
  if (!ipLimit.allowed) {
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
  const { email, password } = parsed.data;

  const emailLimit = rateLimit(`login-email:${email}`, 8, 15 * 60_000);
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas para este e-mail. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } }
    );
  }

  const user = await getUserByEmail(email);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const adega = await getAdegaById(user.adegaId);

  const session = await getSession();
  session.user = {
    userId: user.id,
    adegaId: user.adegaId,
    adegaName: adega?.name ?? "Adega",
    filialId: user.filialId,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  await session.save();

  return NextResponse.json({ ok: true, role: user.role });
});
