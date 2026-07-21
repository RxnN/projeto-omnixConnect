import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, createAdega, createUser } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";
import { cadastroSchema, firstZodError } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { allowed, retryAfterSeconds } = rateLimit(`cadastro:${clientIp(req)}`, 5, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = cadastroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { adegaName, userName, email, password } = parsed.data;

  // Verificar se o e-mail já está cadastrado
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return NextResponse.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 400 });
  }

  // Criar a adega (nasce travada — approved: false — até o pagamento ser confirmado)
  const adega = await createAdega(adegaName);

  // Criptografar a senha do usuário
  const passwordHash = await bcrypt.hash(password, 10);

  // Criar o usuário dono (OWNER)
  const user = await createUser({
    adegaId: adega.id,
    name: userName,
    email,
    passwordHash,
    role: "OWNER",
  });

  // Iniciar a sessão do usuário
  const session = await getSession();
  session.user = {
    userId: user.id,
    adegaId: adega.id,
    adegaName: adega.name,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  await session.save();

  return NextResponse.json({ ok: true });
});
