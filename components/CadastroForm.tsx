"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Turnstile, { type TurnstileHandle } from "./Turnstile";

export default function CadastroForm() {
  const [empresaName, setEmpresaName] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

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
        body: JSON.stringify({ empresaName, cnpjCpf, userName, phone, email, password, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível realizar o cadastro.");
        setLoading(false);
        // Token do Turnstile é de uso único — precisa resolver o desafio de novo
        // antes de tentar submeter outra vez.
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }

      // Navegação completa — mesmo motivo do LoginForm: evita reaproveitar cache de rota
      // de uma sessão anterior (ex: testar como funcionário logo depois de estar como dono).
      window.location.href = "/inicio";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="empresaName">
          Nome da Empresa
        </label>
        <input
          id="empresaName"
          type="text"
          required
          className="input"
          value={empresaName}
          onChange={(e) => setEmpresaName(e.target.value)}
          placeholder="Ex: Empresa Exemplo Ltda"
        />
      </div>

      <div>
        <label className="label" htmlFor="cnpjCpf">
          CNPJ ou CPF
        </label>
        <input
          id="cnpjCpf"
          type="text"
          required
          className="input"
          value={cnpjCpf}
          onChange={(e) => setCnpjCpf(e.target.value)}
          placeholder="Só números"
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
        <label className="label" htmlFor="phone">
          Contato (telefone/WhatsApp)
        </label>
        <input
          id="phone"
          type="tel"
          required
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex: (11) 91234-5678"
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
          placeholder="dono@suaempresa.com"
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

      <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading || !turnstileToken} className="btn-primary w-full">
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
