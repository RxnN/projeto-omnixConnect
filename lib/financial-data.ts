import type { PedidoWithItems } from "./types";

/** Remove valores financeiros antes de serializar pedidos para componentes cliente. */
export function redactPedidoValues(pedido: PedidoWithItems): PedidoWithItems {
  return {
    ...pedido,
    totalValue: 0,
    items: pedido.items.map((item) => ({ ...item, unitValue: 0, totalValue: 0 })),
  };
}

export function redactPedidosValues(pedidos: PedidoWithItems[]): PedidoWithItems[] {
  return pedidos.map(redactPedidoValues);
}
