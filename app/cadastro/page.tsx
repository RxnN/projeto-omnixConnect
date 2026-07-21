import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import CadastroForm from "@/components/CadastroForm";

export default async function CadastroPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/pedidos");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-extrabold">🍷 Adegas</h1>
          <p className="mt-1" style={{ color: "var(--ink-soft)" }}>
            Crie sua conta SaaS multi-tenant
          </p>
        </div>
        <div className="card">
          <CadastroForm />
        </div>
      </div>
    </div>
  );
}
