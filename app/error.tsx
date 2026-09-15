"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <section className="card mx-auto max-w-xl space-y-5 text-center" role="alert">
      <div>
        <span className="page-eyebrow">Falha temporária</span>
        <h1 className="page-title">Não foi possível carregar esta página</h1>
        <p className="page-description">
          Seus dados não foram apagados. Tente carregar novamente; se o problema continuar, informe o código abaixo ao suporte.
        </p>
      </div>
      {error.digest && (
        <p className="font-mono text-xs" style={{ color: "var(--ink-soft)" }}>
          Código do erro: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>Tentar novamente</button>
        <button type="button" className="btn-secondary" onClick={() => { window.location.href = "/inicio"; }}>
          Voltar ao início
        </button>
      </div>
    </section>
  );
}
