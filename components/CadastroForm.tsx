"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroForm() {
  const router = useRouter();
  const [adegaName, setAdegaName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adegaName, userName, email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error ?? "Não foi possível realizar o cadastro.");
        setLoading(false);
        return;
      }

      router.push("/pedidos");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="adegaName">
          Nome da Adega
        </label>
        <input
          id="adegaName"
          type="text"
          required
          className="input"
          value={adegaName}
          onChange={(e) => setAdegaName(e.target.value)}
          placeholder="Ex: Adega do Porto"
        />
      </div>

      <div>
        <label className="label" htmlFor="userName">
          Seu Nome Completo
        </label>
        <input
          id="userName"
          type="text"
          required
          className="input"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Ex: João Silva"
        />
      </div>

      <div>
        <label className="label" htmlFor="email">
          E-mail de Acesso
        </label>
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dono@suaadega.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo de 6 caracteres"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Cadastrando..." : "Cadastrar e Entrar"}
      </button>

      <div className="text-center mt-4">
        <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
          Já tem uma conta?{" "}
          <Link href="/" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
            Faça login
          </Link>
        </p>
      </div>
    </form>
  );
}
