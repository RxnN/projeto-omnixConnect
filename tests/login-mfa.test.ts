import { describe, expect, it } from "vitest";
import { createLoginMfaCode, verifyLoginMfaCode } from "@/lib/login-mfa";

describe("MFA de login do dono", () => {
  it("gera um código de seis números e armazena somente seu hash", () => {
    const generated = createLoginMfaCode();
    expect(generated.code).toMatch(/^\d{6}$/);
    expect(generated.codeHash).not.toContain(generated.code);
    expect(verifyLoginMfaCode(generated.code, generated.codeHash)).toBe(true);
    const wrong = generated.code === "000000" ? "000001" : "000000";
    expect(verifyLoginMfaCode(wrong, generated.codeHash)).toBe(false);
  });
});
