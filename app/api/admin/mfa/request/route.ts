import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminIdentityApi } from "@/lib/admin-access";
import { createAdminMfaCode } from "@/lib/admin-mfa";
import { withErrorHandling } from "@/lib/api-handler";
import { sendAdminMfaCode } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = await requireSuperAdminIdentityApi();
  const limit = await rateLimit(`admin-mfa-send:${admin.email}:${clientIp(req)}`, 3, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitos códigos solicitados. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const generated = createAdminMfaCode();
  const session = await getSession();
  session.adminMfa = { codeHash: generated.codeHash, expiresAt: generated.expiresAt, attempts: 0 };
  await session.save();
  await sendAdminMfaCode(admin.email, generated.code, randomUUID());
  return NextResponse.json({ ok: true });
});
