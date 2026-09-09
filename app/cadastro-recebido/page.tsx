import Link from "next/link";

export default function CadastroRecebidoPage() {
  return (
    <div className="max-w-md mx-auto text-center py-20 px-4">
      <h1 className="text-2xl font-bold mb-2">Confira seu e-mail</h1>
      <p style={{ color: "var(--ink-soft)" }}>
        Se o endereço puder receber o cadastro, enviaremos um link válido por 24 horas. Depois da confirmação, a
        empresa ficará aguardando a conferência e a aprovação do acesso.
      </p>
      <Link href="/" className="btn-primary inline-flex mt-6">
        Voltar ao login
      </Link>
    </div>
  );
}
