const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const RLS_SECRET_EXAMPLE = "gere_uma_chave_aleatoria_independente_com_32_ou_mais_caracteres";

if (
  !isDev &&
  (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === TURNSTILE_TEST_SITE_KEY ||
    process.env.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET_KEY)
) {
  throw new Error("As chaves de teste do Turnstile não podem ser usadas no build de produção.");
}

if (!isDev) {
  if (
    !process.env.RLS_CONTEXT_SECRET ||
    process.env.RLS_CONTEXT_SECRET.length < 32 ||
    process.env.RLS_CONTEXT_SECRET === RLS_SECRET_EXAMPLE
  ) {
    throw new Error("RLS_CONTEXT_SECRET forte e exclusivo é obrigatório em produção.");
  }
  if (
    !process.env.RESEND_API_KEY ||
    process.env.RESEND_API_KEY === "re_substitua_pela_chave_real" ||
    !process.env.EMAIL_FROM ||
    !process.env.APP_ORIGIN
  ) {
    throw new Error("RESEND_API_KEY, EMAIL_FROM e APP_ORIGIN são obrigatórios para confirmar e-mails.");
  }
}

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

// Sem SENTRY_AUTH_TOKEN (antes de criar a conta), o plugin só pula o upload de
// source maps silenciosamente — não quebra o build.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
});
