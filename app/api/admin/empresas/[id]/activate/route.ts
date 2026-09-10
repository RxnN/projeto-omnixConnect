import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { activateAdminCompany } from "@/lib/admin-company";
import { requireSuperAdminApi } from "@/lib/admin-access";
import { withErrorHandling } from "@/lib/api-handler";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const activationSchema = z.object({
  days: z.number().int().min(1).max(3650),
});

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (req: NextRequest, { params }) => {
  const admin = await requireSuperAdminApi();
  const limit = await rateLimit(`admin-activate:${admin.email}:${clientIp(req)}`, 20, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas ativações em sequência. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = activationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um prazo entre 1 e 3650 dias." }, { status: 400 });
  }

  const { id } = await params;
  const empresa = await activateAdminCompany(id, parsed.data.days, admin.email);
  console.info("[admin] empresa ativada", {
    admin: admin.email,
    empresaId: empresa.id,
    paidUntil: empresa.paidUntil?.toISOString(),
  });
  return NextResponse.json({ ok: true, empresa });
});
