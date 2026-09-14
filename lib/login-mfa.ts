import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const LOGIN_MFA_CODE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_MFA_MAX_ATTEMPTS = 5;

function mfaSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET inválido para MFA.");
  return secret;
}

export function createLoginMfaCode() {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return { code, codeHash: hashLoginMfaCode(code), expiresAt: Date.now() + LOGIN_MFA_CODE_TTL_MS };
}

export function hashLoginMfaCode(code: string): string {
  return createHmac("sha256", mfaSecret()).update(`owner-login-mfa:${code}`).digest("hex");
}

export function verifyLoginMfaCode(code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashLoginMfaCode(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
