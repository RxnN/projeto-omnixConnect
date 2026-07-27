/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  async headers() {
    // CSP estática (sem nonce/middleware): 'unsafe-inline' em script-src é necessário
    // porque o App Router injeta seus próprios scripts inline de hidratação/streaming
    // com conteúdo dinâmico por requisição. 'unsafe-eval' só entra em desenvolvimento
    // — o webpack do Next usa eval() para os módulos em dev/Fast Refresh; em produção
    // isso não é necessário e fica de fora, mantendo a CSP mais restrita.
    // challenges.cloudflare.com liberado em script-src/connect-src/frame-src pro widget
    // Cloudflare Turnstile (login/cadastro) — carrega um script e renderiza um iframe
    // desse domínio, além de chamar ele via fetch/XHR pra validar o desafio.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src 'self' https://challenges.cloudflare.com${isDev ? " ws:" : ""}`,
      "frame-src 'self' https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
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

module.exports = nextConfig;
