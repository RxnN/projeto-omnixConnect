import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPendingFilial, listFiliais } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { hasPermission, requireApiUser } from "@/lib/auth";

const filialSchema = z.object({ name: z.string().trim().min(1, "Informe o nome da filial.") });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireApiUser();
  if (!(await hasPermission(user, "MANAGE_BRANCHES"))) {
    return NextResponse.json({ error: "Você não tem permissão para solicitar filiais." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = filialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const existentes = await listFiliais(user.empresaId);
  if (existentes.some((f) => !f.approved)) {
    return NextResponse.json(
      { error: "Você já tem uma solicitação de filial aguardando aprovação." },
      { status: 409 }
    );
  }

  const filial = await createPendingFilial(user.empresaId, parsed.data.name);
  return NextResponse.json({ ok: true, filial });
});
