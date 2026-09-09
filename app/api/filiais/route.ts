import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createFilialWithinLimit, listFiliais } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { hasPermission, requireApiUser } from "@/lib/auth";

const filialSchema = z.object({ name: z.string().trim().min(1, "Informe o nome da filial.").max(200, "Nome da filial muito longo.") });

export const GET = withErrorHandling(async () => {
  const user = await requireApiUser();

  const filiais = await listFiliais(user.empresaId);
  return NextResponse.json({ filiais });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireApiUser();
  if (!(await hasPermission(user, "MANAGE_BRANCHES"))) {
    return NextResponse.json({ error: "Você não tem permissão para criar filiais." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = filialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { filial, limit } = await createFilialWithinLimit(user.empresaId, parsed.data.name);
  if (!filial) {
    return NextResponse.json(
      {
        error: `Sua conta está licenciada para ${limit} filial(is). Fale com a gente para liberar mais.`,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, filial });
});
