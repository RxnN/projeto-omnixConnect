import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAdegaById } from "@/lib/repo";

export default async function AguardandoAprovacaoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const adega = await getAdegaById(user.adegaId);
  if (adega?.approved) redirect("/pedidos");

  return (
    <div className="max-w-md mx-auto text-center py-20">
      <h1 className="text-2xl font-bold mb-2">Conta aguardando aprovação</h1>
      <p style={{ color: "var(--ink-soft)" }}>
        Sua conta em <strong>{adega?.name ?? "sua adega"}</strong> foi criada, mas o acesso só é liberado depois da
        confirmação do pagamento. Assim que aprovarmos, você já pode entrar normalmente — não precisa se cadastrar
        de novo.
      </p>
    </div>
  );
}
