function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const origin = process.env.APP_ORIGIN;
  if (!apiKey || !from || !origin) {
    throw new Error("Confirmação de e-mail não configurada: defina RESEND_API_KEY, EMAIL_FROM e APP_ORIGIN.");
  }
  return { apiKey, from, origin: new URL(origin).origin };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendEmailVerification(input: {
  email: string;
  token: string;
  tokenHash: string;
}) {
  const { apiKey, from, origin } = emailConfig();
  const verificationUrl = new URL("/verificar-email", origin);
  // O fragmento não é enviado ao servidor no GET inicial, evitando que o token apareça
  // em logs de acesso ou seja consumido por pré-visualizadores de links.
  verificationUrl.hash = `token=${encodeURIComponent(input.token)}`;
  const safeUrl = escapeHtml(verificationUrl.toString());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `email-verification-${input.tokenHash}`,
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Confirme seu e-mail no Omnix Connect",
      text: `Confirme seu e-mail abrindo este endereço: ${verificationUrl.toString()}\n\nO link expira em 24 horas.`,
      html: `<p>Confirme seu e-mail para continuar o cadastro no Omnix Connect.</p><p><a href="${safeUrl}">Confirmar meu e-mail</a></p><p>O link expira em 24 horas.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`O serviço de e-mail recusou a mensagem (HTTP ${response.status}).`);
  }
}
