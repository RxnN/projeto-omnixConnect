import crypto from "node:crypto";

/** Gera ids com prefixo legível (ex: "prod_a1b2c3...") para facilitar debug/leitura de logs. */
export function createId(prefix = "c") {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}
