import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { emailVerificationSchema, firstZodError } from "@/lib/validation";
import { verifyEmailAddress } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { hashEmailVerificationToken } from "@/lib/email-verification";
import { trustOwnerDevice } from "@/lib/trusted-device";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = emailVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }

  const ipLimit = await rateLimit(`verificar-email-ip:${clientIp(req)}`, 20, 60 * 60_000);
  const tokenLimit = await rateLimit(
    `verificar-email-token:${hashEmailVerificationToken(parsed.data.token)}`,
    5,
    60 * 60_000,
  );
  if (!ipLimit.allowed || !tokenLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(ipLimit.retryAfterSeconds, tokenLimit.retryAfterSeconds)) },
      },
    );
  }

  const result = await verifyEmailAddress(parsed.data.token);
  if (result.status !== "VERIFIED") {
    return NextResponse.json({ error: "Este link é inválido, expirou ou já foi utilizado." }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  await trustOwnerDevice(response, { id: result.userId, sessionVersion: result.sessionVersion });
  return response;
});
