"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FilialFilter({
  filiais,
  filialId,
}: {
  filiais: { id: string; name: string }[];
  filialId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (filiais.length <= 1) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("filial", e.target.value);
    } else {
      params.delete("filial");
    }
    router.push(`/relatorios?${params.toString()}`);
  }

  return (
    <select className="input !w-auto text-xs py-1.5" value={filialId ?? ""} onChange={handleChange} aria-label="Filtrar por filial">
      <option value="">Todas as filiais</option>
      {filiais.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
