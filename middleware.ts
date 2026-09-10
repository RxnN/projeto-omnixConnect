import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, IDLE_TIMEOUT_MS, type SessionData } from "@/lib/session";
import { getAdminMfaPath, getAdminPath } from "@/lib/admin-path";

/** Renova ou encerra a sessão ociosa e cria a política CSP com um nonce novo por
 * requisição, compartilhado com o layout pelo cabeçalho interno x-nonce. */
export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' https://challenges.cloudflare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${isDev ? " ws:" : ""}`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const adminPath = getAdminPath();
  const adminMfaPath = getAdminMfaPath();
  const isAdminEntry = req.nextUrl.pathname === adminPath;
  const isAdminMfaEntry = req.nextUrl.pathname === adminMfaPath;
  if (isAdminEntry || isAdminMfaEntry) requestHeaders.set("x-admin-route", "1");

  if (
    adminPath !== "/admin" &&
    (req.nextUrl.pathname === "/admin" || req.nextUrl.pathname === "/admin-verificacao")
  ) {
    return new NextResponse("Página não encontrada.", {
      status: 404,
      headers: { "Content-Security-Policy": csp, "X-Content-Type-Options": "nosniff" },
    });
  }

  const rewriteUrl = req.nextUrl.clone();
  if (isAdminEntry) rewriteUrl.pathname = "/admin";
  if (isAdminMfaEntry) rewriteUrl.pathname = "/admin-verificacao";
  const res = isAdminEntry || isAdminMfaEntry
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  const session = await getIronSession<{ user?: SessionData }>(req, res, sessionOptions);

  if (session.user) {
    if (Date.now() - session.user.lastActivityAt > IDLE_TIMEOUT_MS) {
      session.destroy();
    } else {
      session.user.lastActivityAt = Date.now();
      await session.save();
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
