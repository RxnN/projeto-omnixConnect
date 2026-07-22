"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FilialForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/filiais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a filial.");
        setLoading(false);
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        required
        className="input flex-1"
        placeholder="Ex: Filial Centro"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={loading} className="btn-primary shrink-0">
        {loading ? "Criando..." : "+ Nova filial"}
      </button>
      {error && (
        <p className="text-sm sm:col-span-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
