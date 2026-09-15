import { sealData, unsealData } from "iron-session";
import type { NextRequest, NextResponse } from "next/server";

export const TRUSTED_DEVICE_COOKIE = "owner_trusted_device";
export const TRUSTED_DEVICE_TTL_SECONDS = 30 * 24 * 60 * 60;

interface TrustedDeviceData {
  userId: string;
  sessionVersion: number;
  expiresAt: number;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET inválido para dispositivo confiável.");
  return secret;
}

export async function createTrustedDeviceCookieValue(userId: string, sessionVersion: number): Promise<string> {
  return sealData(
    { userId, sessionVersion, expiresAt: Date.now() + TRUSTED_DEVICE_TTL_SECONDS * 1000 } satisfies TrustedDeviceData,
    { password: sessionSecret(), ttl: TRUSTED_DEVICE_TTL_SECONDS },
  );
}

export async function isTrustedOwnerDevice(
  req: NextRequest,
  user: { id: string; sessionVersion: number },
): Promise<boolean> {
  const value = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (!value) return false;

  try {
    const trusted = await unsealData<TrustedDeviceData>(value, {
      password: sessionSecret(),
      ttl: TRUSTED_DEVICE_TTL_SECONDS,
    });
    return (
      trusted.userId === user.id &&
      trusted.sessionVersion === user.sessionVersion &&
      Number.isFinite(trusted.expiresAt) &&
      trusted.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function trustOwnerDevice(
  response: NextResponse,
  user: { id: string; sessionVersion: number },
): Promise<void> {
  response.cookies.set({
    name: TRUSTED_DEVICE_COOKIE,
    value: await createTrustedDeviceCookieValue(user.id, user.sessionVersion),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_DEVICE_TTL_SECONDS,
  });
}

export function forgetTrustedOwnerDevice(response: NextResponse): void {
  response.cookies.set({
    name: TRUSTED_DEVICE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
