import { NextRequest, NextResponse } from "next/server";

/** Envolve um handler de rota de API pra garantir que qualquer exceção não tratada
 * (erro de conexão com o banco, bug inesperado, etc) vire uma resposta JSON consistente
 * em vez de deixar o Next.js retornar seu erro genérico — e loga o erro no servidor
 * pra dar pra investigar depois. */
export function withErrorHandling<C = unknown>(
  handler: (req: NextRequest, context: C) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: C): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error(`[${req.method} ${req.nextUrl.pathname}]`, error);
      return NextResponse.json({ error: "Ocorreu um erro interno. Tente novamente." }, { status: 500 });
    }
  };
}
