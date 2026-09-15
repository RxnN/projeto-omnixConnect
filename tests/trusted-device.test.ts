import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  createTrustedDeviceCookieValue,
  forgetTrustedOwnerDevice,
  isTrustedOwnerDevice,
  TRUSTED_DEVICE_COOKIE,
  trustOwnerDevice,
} from "@/lib/trusted-device";

function requestWithCookie(value: string) {
  return new NextRequest("http://localhost/", {
    headers: { cookie: `${TRUSTED_DEVICE_COOKIE}=${value}` },
  });
}

describe("dispositivo confiável do dono", () => {
  it("aceita somente o mesmo usuário e a mesma versão de senha", async () => {
    const value = await createTrustedDeviceCookieValue("owner-1", 3);
    const request = requestWithCookie(value);

    await expect(isTrustedOwnerDevice(request, { id: "owner-1", sessionVersion: 3 })).resolves.toBe(true);
    await expect(isTrustedOwnerDevice(request, { id: "owner-2", sessionVersion: 3 })).resolves.toBe(false);
    await expect(isTrustedOwnerDevice(request, { id: "owner-1", sessionVersion: 4 })).resolves.toBe(false);
  });

  it("rejeita um cookie adulterado", async () => {
    const request = requestWithCookie("valor-inventado");
    await expect(isTrustedOwnerDevice(request, { id: "owner-1", sessionVersion: 0 })).resolves.toBe(false);
  });

  it("grava o cookie como HttpOnly e permite removê-lo", async () => {
    const response = NextResponse.json({ ok: true });
    await trustOwnerDevice(response, { id: "owner-1", sessionVersion: 0 });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=2592000");

    const cleared = NextResponse.json({ ok: true });
    forgetTrustedOwnerDevice(cleared);
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
