import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAdegaById } from "@/lib/repo";
import { isSubscriptionExpired } from "@/lib/auth";

export default async function AguardandoAprovacaoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const adega = await getAdegaById(user.adegaId);
  const expired = adega ? isSubscriptionExpired(adega) : false;
  if (adega?.approved && !expired) redirect("/pedidos");

  return (
    <div className="max-w-md mx-auto text-center py-20">
      <h1 className="text-2xl font-bold mb-2">
        {expired ? "Assinatura vencida" : "Conta aguardando aprovação"}
      </h1>
      <p style={{ color: "var(--ink-soft)" }}>
        {expired ? (
          <>
            O acesso de <strong>{adega?.name ?? "sua adega"}</strong> foi pausado porque o período pago venceu.
            Assim que o pagamento for renovado, o acesso volta ao normal.
          </>
        ) : (
          <>
            Sua conta em <strong>{adega?.name ?? "sua adega"}</strong> foi criada, mas o acesso só é liberado depois
            da confirmação do pagamento. Assim que aprovarmos, você já pode entrar normalmente — não precisa se
            cadastrar de novo.
          </>
        )}
      </p>
    </div>
  );
}
