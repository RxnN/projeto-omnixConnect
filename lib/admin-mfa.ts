import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const ADMIN_MFA_CODE_TTL_MS = 10 * 60 * 1000;
export const ADMIN_MFA_MAX_ATTEMPTS = 5;

function mfaSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET inválido para MFA.");
  return secret;
}

export function createAdminMfaCode() {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return { code, codeHash: hashAdminMfaCode(code), expiresAt: Date.now() + ADMIN_MFA_CODE_TTL_MS };
}

export function hashAdminMfaCode(code: string): string {
  return createHmac("sha256", mfaSecret()).update(`admin-mfa:${code}`).digest("hex");
}

export function verifyAdminMfaCode(code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashAdminMfaCode(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
