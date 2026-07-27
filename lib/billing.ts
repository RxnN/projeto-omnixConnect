// Valor de exemplo — ajustar para o preço real do plano por filial quando definido.
export const FILIAL_MONTHLY_PRICE = 100;
export const EXTRA_FILIAL_DISCOUNT = 0.1;

export interface FilialUpgradeEstimate {
  basePrice: number;
  discount: number;
  currentTotal: number;
  newFilialPrice: number;
  newTotal: number;
}

/** Estimativa de cobrança ao solicitar +1 filial: desconto de 10% incide só sobre o
 * valor da filial nova, não sobre o total já pago pelas filiais existentes. */
export function estimateFilialUpgrade(activeFiliaisCount: number): FilialUpgradeEstimate {
  const currentTotal = activeFiliaisCount * FILIAL_MONTHLY_PRICE;
  const newFilialPrice = FILIAL_MONTHLY_PRICE * (1 - EXTRA_FILIAL_DISCOUNT);
  return {
    basePrice: FILIAL_MONTHLY_PRICE,
    discount: EXTRA_FILIAL_DISCOUNT,
    currentTotal,
    newFilialPrice,
    newTotal: currentTotal + newFilialPrice,
  };
}
