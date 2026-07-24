import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { registerEmpresaWithOwner } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";
import { cadastroSchema, firstZodError } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const globalLimit = await rateLimit("cadastro:global", 100, 60 * 60_000);
  const { allowed, retryAfterSeconds } = await rateLimit(`cadastro:${clientIp(req)}`, 5, 60 * 60_000);
  if (!globalLimit.allowed) {
    return NextResponse.json(
      { error: "Cadastros temporariamente limitados. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(globalLimit.retryAfterSeconds) } }
    );
  }
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
  const { empresaName, cnpjCpf, userName, phone, email, password } = parsed.data;
  const [documentLimit, emailLimit] = await Promise.all([
    rateLimit(`cadastro-documento:${cnpjCpf}`, 3, 24 * 60 * 60_000),
    rateLimit(`cadastro-email:${email}`, 3, 24 * 60 * 60_000),
  ]);
  if (!documentLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro para estes dados. Tente novamente mais tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(documentLimit.retryAfterSeconds, emailLimit.retryAfterSeconds)) },
      }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let registered;
  try {
    registered = await registerEmpresaWithOwner({
      empresaName,
      cnpjCpf,
      userName,
      phone,
      email,
      passwordHash,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Não foi possível concluir o cadastro. Verifique se o e-mail ou documento já está cadastrado." },
        { status: 409 }
      );
    }
    throw error;
  }
  const { empresa, user } = registered;

  // Iniciar a sessão do usuário
  const session = await getSession();
  session.user = {
    userId: user.id,
    empresaId: empresa.id,
    empresaName: empresa.name,
    filialId: null,
    name: user.name,
    email: user.email,
    role: user.role,
    lastActivityAt: Date.now(),
  };
  await session.save();

  return NextResponse.json({ ok: true });
});
