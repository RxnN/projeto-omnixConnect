import ConfirmEmailForm from "@/components/ConfirmEmailForm";

export default function VerificarEmailPage() {
  return (
    <div className="max-w-md mx-auto text-center py-20 px-4">
      <h1 className="text-2xl font-bold mb-3">Confirmação de e-mail</h1>
      <ConfirmEmailForm />
    </div>
  );
}
