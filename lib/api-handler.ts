import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { alertSecurityEvent } from "./security-monitoring";

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
const MAX_MULTIPART_BODY_SIZE = 5 * 1024 * 1024 + 128 * 1024;

async function bufferBodyWithinLimit(req: NextRequest, maxBytes: number): Promise<NextRequest> {
  const body = req.body;
  if (!body) return req;
  const reader = body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "Corpo da requisição muito grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new NextRequest(req.url, {
    method: req.method,
    headers: req.headers,
    body: bytes,
    signal: req.signal,
  });
}

async function validateRequestSource(req: NextRequest): Promise<NextRequest> {
  if (!MUTATING_METHODS.has(req.method)) return req;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    alertSecurityEvent("request_origin_rejected");
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
      alertSecurityEvent("request_origin_rejected");
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
  if (requiresJson) {
    return bufferBodyWithinLimit(req, MAX_JSON_BODY_SIZE);
  } else if (req.nextUrl.pathname === "/api/nfe-import" || req.nextUrl.pathname === "/api/produtos/import") {
    return bufferBodyWithinLimit(req, MAX_MULTIPART_BODY_SIZE);
  }
  return req;
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
      const validatedReq = await validateRequestSource(req);
      return await handler(validatedReq, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status, headers: error.headers });
      }
      console.error(`[${req.method} ${req.nextUrl.pathname}]`, error);
      Sentry.captureException(error);
      return NextResponse.json({ error: "Ocorreu um erro interno. Tente novamente." }, { status: 500 });
    }
  };
}
