import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { registerEmpresaWithOwner } from "@/lib/repo";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";
import { cadastroSchema, firstZodError } from "@/lib/validation";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendEmailVerification } from "@/lib/email";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { allowed, retryAfterSeconds } = await rateLimit(`cadastro:${clientIp(req)}`, 5, 60 * 60_000);
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
  const { empresaName, cnpjCpf, userName, phone, email, password, turnstileToken } = parsed.data;

  await verifyTurnstile(turnstileToken, clientIp(req));

  // A cota compartilhada só é consumida depois que corpo e desafio foram validados.
  const globalLimit = await rateLimit("cadastro:global", 100, 60 * 60_000);
  if (!globalLimit.allowed) {
    return NextResponse.json(
      { error: "Cadastros temporariamente limitados. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(globalLimit.retryAfterSeconds) } }
    );
  }

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
  try {
    const registration = await registerEmpresaWithOwner({
      empresaName,
      cnpjCpf,
      userName,
      phone,
      email,
      passwordHash,
    });
    if (registration.verification) {
      await sendEmailVerification(registration.verification);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Mesma resposta de uma solicitação aceita: não revela se e-mail ou documento já existe.
      return NextResponse.json({ ok: true });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
});
