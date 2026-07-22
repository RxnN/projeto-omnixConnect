"use client";

import { useRouter } from "next/navigation";

export default function FilialSwitcher({
  filiais,
  currentFilialId,
}: {
  filiais: { id: string; name: string }[];
  currentFilialId: string | null;
}) {
  const router = useRouter();

  if (filiais.length <= 1) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `selectedFilialId=${e.target.value}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <select
      className="input text-xs py-1.5"
      value={currentFilialId ?? filiais[0].id}
      onChange={handleChange}
      aria-label="Filial ativa"
    >
      {filiais.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
