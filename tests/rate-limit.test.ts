import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { clientIp } from "@/lib/rate-limit";

function makeRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/login", { headers });
}

describe("clientIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignora X-Forwarded-For sem proxy confiável configurado (evita spoofing)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUST_PROXY", "");
    vi.stubEnv("VERCEL", "");

    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(clientIp(req)).toBe("proxy-nao-configurado");
  });

  it("confia no cabeçalho quando TRUST_PROXY=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUST_PROXY", "true");
    vi.stubEnv("VERCEL", "");

    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("confia automaticamente no cabeçalho quando executando na Vercel (VERCEL=1)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUST_PROXY", "");
    vi.stubEnv("VERCEL", "1");

    const req = makeRequest({ "x-forwarded-for": "5.6.7.8" });
    expect(clientIp(req)).toBe("5.6.7.8");
  });

  it("usa X-Real-IP quando X-Forwarded-For está ausente, com proxy confiável", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUST_PROXY", "true");
    vi.stubEnv("VERCEL", "");

    const req = makeRequest({ "x-real-ip": "9.9.9.9" });
    expect(clientIp(req)).toBe("9.9.9.9");
  });
});
