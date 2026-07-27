import { cookies } from "next/headers";
import { createFilial, getEmpresaById, getFilialById, listActiveFiliais } from "./repo";
import type { SessionData } from "./session";

const FILIAL_COOKIE = "selectedFilialId";

/** Resolve a filial "atual" pra ações da tela (Pedidos, Entrada, Produtos...).
 * MANAGER/EMPLOYEE estão sempre travados na própria filial. OWNER enxerga todas —
 * a filial ativa vem de um cookie simples (trocado pelo FilialSwitcher), caindo pra
 * primeira filial da empresa se nada foi selecionado ainda (toda empresa deveria ter >= 1;
 * se por algum motivo não tiver — ex: conta antiga de antes dessa migração — cria a
 * matriz na hora em vez de quebrar a página).
 *
 * Se a própria empresa da sessão não existir mais (cookie de uma conta apagada), não
 * tenta criar filial nenhuma — isso violaria a FK e mascararia o problema real, que é
 * a sessão estar inválida. Lança um erro claro em vez disso. */
export async function getCurrentFilialId(user: SessionData): Promise<string> {
  if (user.filialId) {
    const assigned = await getFilialById(user.filialId, user.empresaId);
    if (assigned) return assigned.id;
    if (user.role !== "OWNER") {
      throw new Error("A filial vinculada a este usuário não pertence mais à empresa.");
    }
  }

  const selected = (await cookies()).get(FILIAL_COOKIE)?.value;
  if (selected) {
    const filial = await getFilialById(selected, user.empresaId);
    if (filial) return filial.id;
  }

  const filiais = await listActiveFiliais(user.empresaId);
  if (filiais.length > 0) return filiais[0].id;

  const empresa = await getEmpresaById(user.empresaId);
  if (!empresa) {
    throw new Error("Sessão inválida: a conta associada a este login não existe mais. Faça login novamente.");
  }
  const filial = await createFilial(user.empresaId, empresa.name);
  return filial.id;
}

export const SELECTED_FILIAL_COOKIE = FILIAL_COOKIE;
