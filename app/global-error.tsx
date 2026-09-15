"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
            fontFamily: "sans-serif",
          }}
        >
          <div>
            <h1>Algo deu errado.</h1>
            <p>Já fomos avisados. Seus dados não foram apagados.</p>
            {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12 }}>Código do erro: {error.digest}</p>}
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
