"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodeImage({ value, fileName }: { value: string; fileName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 16,
        margin: 10,
      });
      setDataUrl(canvasRef.current.toDataURL("image/png"));
      setError(false);
    } catch {
      setError(true);
    }
  }, [value]);

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--warn)" }}>
        Não foi possível gerar o código de barras para "{value}".
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Fundo branco fixo independente do tema — leitores físicos precisam de barras escuras sobre fundo claro */}
      <div className="bg-white rounded-lg p-3 inline-block">
        <canvas ref={canvasRef} className="mx-auto max-w-full" />
      </div>
      {dataUrl && (
        <a href={dataUrl} download={fileName} className="btn-secondary inline-block">
          Baixar / Imprimir código de barras
        </a>
      )}
    </div>
  );
}
