import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "@/lib/turnstile";

const ORIGINAL_SECRET = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  process.env.TURNSTILE_SECRET_KEY = ORIGINAL_SECRET;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("verifyTurnstile", () => {
  it("resolve quando a Cloudflare confirma o token", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({ success: true }) }))
    );

    await expect(verifyTurnstile("token-valido")).resolves.toBeUndefined();
  });

  it("lança ApiError 400 quando a Cloudflare rejeita o token", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }) }))
    );

    await expect(verifyTurnstile("token-invalido")).rejects.toMatchObject({ status: 400 });
  });

  it("lança ApiError 503 quando a chamada à Cloudflare falha (rede)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(verifyTurnstile("token")).rejects.toMatchObject({ status: 503 });
  });

  it("lança erro se TURNSTILE_SECRET_KEY não está configurado", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    await expect(verifyTurnstile("token")).rejects.toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it("rejeita a chave que sempre aprova quando o ambiente é produção", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";

    await expect(verifyTurnstile("token")).rejects.toThrow(/teste.*produção/i);
  });
});
