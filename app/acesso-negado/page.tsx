import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <h1 className="text-2xl font-bold mb-2">Acesso negado</h1>
      <p className="mb-6" style={{ color: "var(--ink-soft)" }}>
        Seu perfil de usuário não tem permissão para acessar esta página.
      </p>
      <Link href="/pedidos" className="btn-primary">
        Voltar para Pedidos
      </Link>
    </div>
  );
}
