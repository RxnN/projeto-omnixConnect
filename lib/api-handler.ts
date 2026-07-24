import { NextRequest, NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: HeadersInit
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const NON_JSON_PATHS = new Set(["/api/logout", "/api/nfe-import", "/api/produtos/import"]);
const MAX_JSON_BODY_SIZE = 1024 * 1024;

function validateRequestSource(req: NextRequest) {
  if (!MUTATING_METHODS.has(req.method)) return;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiError(403, "Origem da requisição não permitida.");
  }

  const origin = req.headers.get("origin");
  if (origin) {
    const allowedOrigins = new Set([req.nextUrl.origin]);
    if (process.env.APP_ORIGIN) {
      try {
        allowedOrigins.add(new URL(process.env.APP_ORIGIN).origin);
      } catch {
        throw new Error("APP_ORIGIN inválida. Informe uma URL completa.");
      }
    }
    if (!allowedOrigins.has(origin)) {
      throw new ApiError(403, "Origem da requisição não permitida.");
    }
  }

  const requiresJson =
    (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") &&
    !NON_JSON_PATHS.has(req.nextUrl.pathname);
  if (requiresJson && !req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "Envie os dados como application/json.");
  }
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (requiresJson && Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_SIZE) {
    throw new ApiError(413, "Corpo da requisição muito grande.");
  }
}

/** Envolve um handler de rota de API pra garantir que qualquer exceção não tratada
 * (erro de conexão com o banco, bug inesperado, etc) vire uma resposta JSON consistente
 * em vez de deixar o Next.js retornar seu erro genérico — e loga o erro no servidor
 * pra dar pra investigar depois. */
export function withErrorHandling<C = unknown>(
  handler: (req: NextRequest, context: C) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: C): Promise<NextResponse> => {
    try {
      validateRequestSource(req);
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status, headers: error.headers });
      }
      console.error(`[${req.method} ${req.nextUrl.pathname}]`, error);
      return NextResponse.json({ error: "Ocorreu um erro interno. Tente novamente." }, { status: 500 });
    }
  };
}
