import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { createFilial, getAdegaById, listFiliais } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";

const filialSchema = z.object({ name: z.string().trim().min(1, "Informe o nome da filial.") });

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const filiais = await listFiliais(user.adegaId);
  return NextResponse.json({ filiais });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Você não tem permissão para criar filiais." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = filialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const [adega, existentes] = await Promise.all([getAdegaById(user.adegaId), listFiliais(user.adegaId)]);
  const limite = adega?.maxFiliais ?? 1;
  if (existentes.length >= limite) {
    return NextResponse.json(
      {
        error: `Sua conta está licenciada para ${limite} filial(is). Fale com a gente para liberar mais.`,
      },
      { status: 403 }
    );
  }

  const filial = await createFilial(user.adegaId, parsed.data.name);
  return NextResponse.json({ ok: true, filial });
});
