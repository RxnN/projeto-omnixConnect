export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Só a data (dd/mm/aaaa), usado nos filtros de período dos relatórios. */
export function formatDateShort(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

/** Data e hora curtas (dd/mm/aa hh:mm), usado no histórico de pedidos. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
