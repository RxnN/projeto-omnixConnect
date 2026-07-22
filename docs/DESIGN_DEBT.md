# DESIGN_DEBT.md — Dívida Técnica Visual (Omnix Connect)

> Organizado por prioridade (Alta → Baixa). "Dívida" aqui é especificamente visual/estrutural de UI — não inclui dívida de backend.

## Prioridade Alta

### 1. Componentes duplicados: 2 implementações de "Abas"
- `components/relatorios/RelatoriosTabs.tsx` (pills `rounded-full`, texto ativo com fundo `--accent`)
- `components/MovimentacoesToggle.tsx` (2 botões `.btn-primary`/`.btn-secondary` simulando abas)
- **Impacto**: mesma ideia de produto (alternar entre visões), duas aparências diferentes. Um usuário que aprende o padrão visual de uma não reconhece o da outra.
- **Correção recomendada**: componente `Tabs` único no Design System, usado nos dois lugares.

### 2. Componentes duplicados: 2 implementações de "seletor de filial"
- `components/FilialSwitcher.tsx` (grava cookie, usado na NavBar)
- `components/relatorios/FilialFilter.tsx` (grava query param, usado em Relatórios)
- **Impacto**: mesmo `<select>` de filiais, renderizado 2x com estilos quase idênticos mas implementações de estado totalmente separadas — qualquer ajuste visual precisa ser feito 2x.
- **Correção recomendada**: um componente `FilialSelect` puramente visual, recebendo `onChange` como prop — a persistência (cookie vs. URL) fica de responsabilidade de quem o usa.

### 3. `window.confirm()` / `window.alert()` no lugar de Modal/Toast
- Usado em: `ProductActiveToggle.tsx`, `HistoricoPedidos.tsx` (cancelar pedido)
- **Impacto**: quebra de identidade visual justamente nas ações de maior risco (destrutivas).
- **Correção recomendada**: `ConfirmDialog` do DS.

### 4. Cabeçalho de página duplicado manualmente
- Padrão `<div><h1 className="text-2xl font-bold">Título</h1><p className="text-sm mt-1" style={{color: "var(--ink-soft)"}}>Descrição</p></div>` está copiado e colado em praticamente todas as 13 páginas internas (`Pedidos`, `Entrada`, `Movimentações`, `Produtos`, `Novo Produto`, `Editar Produto`, `Promoções`, `Filiais`, `Relatórios`...).
- **Impacto**: qualquer mudança de estilo de título (ex: adicionar breadcrumb, ação no canto direito) precisa ser replicada em 13 lugares.
- **Correção recomendada**: componente `PageHeader` no DS.

### 5. `--accent` e `--warn` compartilham o mesmo valor de cor
- Em ambos os temas, claro e escuro, `--accent` (cor de marca) e `--warn` (estado de alerta) usam o mesmo hex.
- **Impacto**: não é só estético — um botão primário e um badge de "estoque baixo" ficam com a mesma cor, confundindo a leitura de "isso é uma ação" vs. "isso é um aviso".
- **Correção recomendada**: separar os tokens já na Fase de tokens do redesign.

## Prioridade Média

### 6. Tabelas quase idênticas reimplementadas 6+ vezes
- `EstoqueAtualTable`, `FaturamentoSection`, `RentabilidadeSection`, `RecorrenciaTable`, `SugestaoCompraTable`, `HistoricoPedidos`, tabela de `/produtos` (inline na page), tabela de `NFeImport` — todas compartilham a mesma estrutura visual (`<table className="min-w-full text-sm">`, `<thead>` cinza uppercase, `divide-y`) escrita do zero em cada arquivo.
- **Impacto**: qualquer ajuste de estilo de tabela (ex: adicionar zebra striping, hover de linha) precisa de 8 edições.
- **Correção recomendada**: `DataTable` genérico parametrizado por `columns`.

### 7. Padding de tabela inconsistente entre implementações
- Algumas tabelas usam `px-4 py-2`, outras `px-3 py-1.5`, outras `px-2 py-1.5` (`NFeImport`) — sem diferença funcional aparente que justifique a variação.
- **Correção recomendada**: normalizar no `DataTable` do item 6.

### 8. `ThemeToggle` renderizado 2x na mesma árvore de NavBar
- Uma instância na barra superior mobile, outra no rodapé do drawer desktop — ambas montadas simultaneamente no DOM (só uma visível por vez via classes responsivas `md:hidden`/`hidden md:block`).
- **Impacto**: 2 instâncias de estado (`useState` local) do mesmo toggle podem, em teoria, dessincronizar visualmente entre o clique em uma e o estado da outra até o próximo re-render/reload (ambas leem `localStorage` só no mount).
- **Correção recomendada**: um único `ThemeToggle` posicionado de forma responsiva via CSS, não duplicado no JSX.

### 9. Ícones sem fonte única
- SVGs manuais só existem na `NavBar`; o resto do produto (botões, estados vazios, KPIs) não usa ícone nenhum, criando uma interface "só texto" fora do menu.
- **Correção recomendada**: adoção de lib de ícones (ver `DEPENDENCY_REPORT.md`) aplicada de forma consistente em todo o produto, não só na navegação.

### 10. Grids de KPI com número de colunas diferente sem padrão
- `/produtos`: 2 colunas · `/relatorios` (Faturamento): 3 colunas · `/relatorios` (Rentabilidade): 4 colunas.
- **Correção recomendada**: componente `KpiGrid` que decide a quantidade de colunas a partir do número de itens, ou um padrão fixo documentado.

## Prioridade Baixa

### 11. Mensagens de loading como texto condicional por componente
- Cada formulário escreve seu próprio "Salvando...", "Criando...", "Cadastrando...", "Entrando...", "Importando...", "Lendo..." como string hardcoded, em vez de um estado de loading padronizado com spinner.
- **Correção recomendada**: prop `loading` no componente `Button` do DS, com spinner visual consistente.

### 12. Uso de `style={{ color: "var(--ink-soft)" }}` inline em centenas de lugares em vez de classe utilitária
- Tecnicamente funciona (CSS variables via inline style), mas impede o Tailwind de fazer purge/otimização de forma previsível e é mais verboso que `className="text-ink-soft"` (que já existe como token no `tailwind.config.ts`, mas é subutilizado — o código prefere `style={{color: "var(--ink-soft)"}}` a `className="text-ink-soft"` na maioria dos componentes).
- **Correção recomendada**: padronizar em `className` usando os tokens já registrados no `tailwind.config.ts`, eliminando `style` inline onde não for estritamente necessário (valores dinâmicos calculados).

### 13. Nenhuma sombra em nenhum componente
- Não é "inconsistência" no sentido de variação — é ausência total de um recurso visual (elevação) mencionado no guideline ("sombras leves").
- **Correção recomendada**: adicionar 1-2 tokens de sombra na Fase de tokens.

---

## Resumo por prioridade

| Prioridade | Itens |
|---|---|
| Alta | 5 |
| Média | 5 |
| Baixa | 3 |
| **Total** | **13** |

Nenhum item desta lista exige mudança de lógica de negócio, rota ou dado — todos são resolvíveis inteiramente na camada visual, dentro do escopo permitido por `CLAUDE.md`.
