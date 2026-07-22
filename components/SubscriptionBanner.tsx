export default function SubscriptionBanner({ daysRemaining }: { daysRemaining: number }) {
  const label =
    daysRemaining <= 0
      ? "Sua assinatura vence hoje."
      : daysRemaining === 1
        ? "Sua assinatura vence amanhã."
        : `Sua assinatura vence em ${daysRemaining} dias.`;

  return (
    <div
      className="px-4 py-2 text-sm text-center font-medium"
      style={{ backgroundColor: "var(--warn-soft)", color: "var(--warn)" }}
    >
      {label} Fale com a gente pra renovar e evitar que o acesso seja pausado.
    </div>
  );
}
