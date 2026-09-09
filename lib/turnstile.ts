import { ApiError } from "./api-handler";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/** Valida no servidor o token do widget Cloudflare Turnstile enviado por um formulário
 * público (login/cadastro) antes de processar a requisição. Lança ApiError(400, ...)
 * se a verificação falhar — encaixa direto no try/catch de withErrorHandling. Falha
 * fechado (rejeita) se o próprio serviço da Cloudflare estiver inacessível. */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "TURNSTILE_SECRET_KEY não configurado. Defina a chave secreta do Cloudflare Turnstile em .env."
    );
  }
  if (process.env.NODE_ENV === "production" && secret === ALWAYS_PASS_TEST_SECRET) {
    throw new Error("A chave de teste do Turnstile não pode ser usada em produção.");
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let result: TurnstileVerifyResponse;
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    result = await res.json();
  } catch {
    throw new ApiError(503, "Não foi possível validar a verificação de segurança. Tente novamente.");
  }

  if (!result.success) {
    throw new ApiError(400, "Verificação de segurança falhou. Recarregue a página e tente novamente.");
  }
}
