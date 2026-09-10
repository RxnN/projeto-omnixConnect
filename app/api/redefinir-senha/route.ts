import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { resetPasswordWithToken } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { verifyTurnstile } from "@/lib/turnstile";
import { firstZodError, passwordResetSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }

  const ip = clientIp(req);
  const [ipLimit, tokenLimit] = await Promise.all([
    rateLimit(`password-reset-confirm-ip:${ip}`, 10, 60 * 60_000),
    rateLimit(`password-reset-confirm-token:${hashPasswordResetToken(parsed.data.token)}`, 5, 60 * 60_000),
  ]);
  if (!ipLimit.allowed || !tokenLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Solicite um novo link mais tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(ipLimit.retryAfterSeconds, tokenLimit.retryAfterSeconds)) },
      },
    );
  }

  await verifyTurnstile(parsed.data.turnstileToken, ip);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const result = await resetPasswordWithToken(parsed.data.token, passwordHash);
  if (result !== "RESET") {
    return NextResponse.json(
      { error: "Este link é inválido, expirou ou já foi utilizado." },
      { status: 400 },
    );
  }

  const session = await getSession();
  session.destroy();
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
});
