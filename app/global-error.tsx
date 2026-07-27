"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
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
            <p>Já fomos avisados sobre o problema. Tente recarregar a página.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
