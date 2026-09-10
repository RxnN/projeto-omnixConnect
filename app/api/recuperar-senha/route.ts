import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { sendPasswordReset } from "@/lib/email";
import { createPasswordResetForEmail } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { firstZodError, passwordResetRequestSchema } from "@/lib/validation";

const GENERIC_MESSAGE = "Se esse e-mail estiver cadastrado e confirmado, enviaremos um link de recuperação.";

function privateEmailKey(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const startedAt = Date.now();
  const body = await req.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }

  const ip = clientIp(req);
  const [ipLimit, emailLimit] = await Promise.all([
    rateLimit(`password-reset-ip:${ip}`, 5, 60 * 60_000),
    rateLimit(`password-reset-email:${privateEmailKey(parsed.data.email)}`, 3, 60 * 60_000),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas solicitações. Aguarde antes de tentar novamente." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds)) },
      },
    );
  }

  await verifyTurnstile(parsed.data.turnstileToken, ip);
  const reset = await createPasswordResetForEmail(parsed.data.email);
  if (reset) {
    try {
      await sendPasswordReset(reset);
    } catch (error) {
      Sentry.captureException(error, { tags: { endpoint: "password-reset-request" } });
    }
  }

  // Reduz diferença de tempo entre conta existente e inexistente sem atrasar envios lentos.
  const remainingDelay = 500 - (Date.now() - startedAt);
  if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));

  return NextResponse.json(
    { ok: true, message: GENERIC_MESSAGE },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
});
