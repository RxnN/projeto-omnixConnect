// Ponto único de entrada da camada de dados — todo o resto do app importa de "@/lib/repo",
// nunca dos módulos internos diretamente. Dividido por domínio (adega/user/product/pedido)
// porque um único arquivo de ~500 linhas misturando os quatro tinha virado difícil de navegar.
export * from "./adega";
export * from "./filial";
export * from "./user";
export * from "./product";
export * from "./pedido";
export * from "./promotion";
