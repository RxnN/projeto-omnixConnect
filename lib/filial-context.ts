import { cookies } from "next/headers";
import { createFilial, getAdegaById, getFilialById, listFiliais } from "./repo";
import type { SessionData } from "./session";

const FILIAL_COOKIE = "selectedFilialId";

/** Resolve a filial "atual" pra ações da tela (Pedidos, Entrada, Produtos...).
 * MANAGER/EMPLOYEE estão sempre travados na própria filial. OWNER enxerga todas —
 * a filial ativa vem de um cookie simples (trocado pelo FilialSwitcher), caindo pra
 * primeira filial da adega se nada foi selecionado ainda (toda adega deveria ter >= 1;
 * se por algum motivo não tiver — ex: conta antiga de antes dessa migração — cria a
 * matriz na hora em vez de quebrar a página).
 *
 * Se a própria adega da sessão não existir mais (cookie de uma conta apagada), não
 * tenta criar filial nenhuma — isso violaria a FK e mascararia o problema real, que é
 * a sessão estar inválida. Lança um erro claro em vez disso. */
export async function getCurrentFilialId(user: SessionData): Promise<string> {
  if (user.filialId) return user.filialId;

  const selected = cookies().get(FILIAL_COOKIE)?.value;
  if (selected) {
    const filial = await getFilialById(selected, user.adegaId);
    if (filial) return filial.id;
  }

  const filiais = await listFiliais(user.adegaId);
  if (filiais.length > 0) return filiais[0].id;

  const adega = await getAdegaById(user.adegaId);
  if (!adega) {
    throw new Error("Sessão inválida: a conta associada a este login não existe mais. Faça login novamente.");
  }
  const filial = await createFilial(user.adegaId, adega.name);
  return filial.id;
}

export const SELECTED_FILIAL_COOKIE = FILIAL_COOKIE;
