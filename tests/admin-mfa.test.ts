import { describe, expect, it } from "vitest";
import { createAdminMfaCode, verifyAdminMfaCode } from "@/lib/admin-mfa";

describe("MFA administrativo", () => {
  it("gera código de seis números e valida somente o código correto", () => {
    const generated = createAdminMfaCode();
    expect(generated.code).toMatch(/^\d{6}$/);
    expect(generated.codeHash).not.toContain(generated.code);
    expect(verifyAdminMfaCode(generated.code, generated.codeHash)).toBe(true);
    const wrong = generated.code === "000000" ? "000001" : "000000";
    expect(verifyAdminMfaCode(wrong, generated.codeHash)).toBe(false);
  });
});
