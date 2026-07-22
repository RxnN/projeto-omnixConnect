# COMPONENT_INVENTORY.md — Inventário de Componentes (Omnix Connect)

> 25 componentes React ao todo (18 em `components/`, 7 em `components/relatorios/`). Nenhum pertence hoje a um Design System formal — essa coluna indica onde cada um **deveria** entrar depois da Fase 3 do `ROADMAP.md`.

## Navegação / Shell

### NavBar
- **Arquivo**: `components/NavBar.tsx`
- **Responsabilidade**: Barra lateral (desktop) / barra superior + drawer (mobile). Monta os links de navegação (condicionados por `role`), nome da empresa, `FilialSwitcher`, dados do usuário logado, `ThemeToggle` e botão "Sair".
- **Onde é usado**: `AppShell.tsx` (único ponto de uso, renderizado para todo usuário autenticado fora de `/` e `/cadastro`)
- **Reutilizável?**: Não — é um componente de shell único, não feito pra reuso.
- **Deveria pertencer ao DS?**: Parcialmente — o padrão de "item de navegação com ícone + estado ativo" deveria virar um subcomponente `NavItem` reutilizável no DS; o shell em si (Sidebar) é específico do produto.
- **Dependências**: `next/link`, `next/navigation` (`usePathname`), `ThemeToggle`, `FilialSwitcher`, ícones SVG inline (não vêm de lib).

### AppShell
- **Arquivo**: `components/AppShell.tsx`
- **Responsabilidade**: Decide se renderiza o shell completo (NavBar + SubscriptionBanner + `<main>`) ou só `<main>` cru, com base na rota atual (`/` e `/cadastro` nunca mostram o menu, mesmo com sessão presente).
- **Onde é usado**: `app/layout.tsx` (layout raiz, ponto único)
- **Reutilizável?**: Não (é o próprio shell da aplicação).
- **Deveria pertencer ao DS?**: Sim, como o "AppShell/Layout template" do Design System.
- **Dependências**: `NavBar`, `SubscriptionBanner`, `next/navigation` (`usePathname`).

### ThemeToggle
- **Arquivo**: `components/ThemeToggle.tsx`
- **Responsabilidade**: Botão que alterna claro/escuro, persistindo em `localStorage` e escrevendo `data-theme` no `<html>`.
- **Onde é usado**: `NavBar.tsx` (2x — versão mobile e desktop, ver `DESIGN_DEBT.md`)
- **Reutilizável?**: Sim, já é isolado.
- **Deveria pertencer ao DS?**: Sim — é um primitivo de shell.
- **Dependências**: nenhuma externa; usa `window.matchMedia`, `localStorage`.

### FilialSwitcher
- **Arquivo**: `components/FilialSwitcher.tsx`
- **Responsabilidade**: `<select>` pra dono trocar a filial ativa (grava cookie + `router.refresh()`). Só renderiza se houver mais de 1 filial.
- **Onde é usado**: `NavBar.tsx`
- **Reutilizável?**: Baixa — específico do domínio (filial), mas o padrão "select nativo estilizado" deveria virar primitivo do DS.
- **Deveria pertencer ao DS?**: O componente em si não; o `<select>` estilizado subjacente sim.
- **Dependências**: `next/navigation` (`useRouter`).

### SubscriptionBanner
- **Arquivo**: `components/SubscriptionBanner.tsx`
- **Responsabilidade**: Faixa de aviso (cor de warning) quando a assinatura está perto de vencer.
- **Onde é usado**: `AppShell.tsx`
- **Reutilizável?**: Sim, é um "banner de alerta" genérico ainda que o texto seja fixo.
- **Deveria pertencer ao DS?**: Sim, como variante de `Banner`/`Alert`.
- **Dependências**: nenhuma.

## Autenticação / Cadastro

### LoginForm
- **Arquivo**: `components/LoginForm.tsx`
- **Responsabilidade**: Formulário de e-mail/senha, chama `/api/login`, navega pra `/pedidos` em caso de sucesso.
- **Onde é usado**: `app/page.tsx` (rota `/`)
- **Reutilizável?**: Não (formulário de propósito único).
- **Deveria pertencer ao DS?**: Não o formulário — mas usa os primitivos `input`/`label`/`btn-primary` que sim.
- **Dependências**: nenhum componente filho.

### CadastroForm
- **Arquivo**: `components/CadastroForm.tsx`
- **Responsabilidade**: Formulário de auto-cadastro (nome da empresa, CNPJ/CPF, nome, telefone, e-mail, senha), chama `/api/cadastro`.
- **Onde é usado**: `app/cadastro/page.tsx`
- **Reutilizável?**: Não.
- **Deveria pertencer ao DS?**: Não o formulário em si.
- **Dependências**: `next/link`.

## Produtos

### ProductForm
- **Arquivo**: `components/ProductForm.tsx`
- **Responsabilidade**: Formulário único de criar/editar produto (nome, categoria com `<datalist>` de sugestões, unidade, preços, estoque, alerta mínimo, tipo de embalagem).
- **Onde é usado**: `app/produtos/novo/page.tsx`, `app/produtos/[id]/editar/page.tsx`
- **Reutilizável?**: Sim, já reutilizado entre criar/editar via prop opcional `product`.
- **Deveria pertencer ao DS?**: Não o formulário completo — mas é o melhor candidato do projeto para virar referência de "formulário padrão" do DS (grid 2 colunas, labels, validação inline).
- **Dependências**: nenhum componente filho.

### ProductAutocomplete
- **Arquivo**: `components/ProductAutocomplete.tsx`
- **Responsabilidade**: Campo de busca com dropdown filtrável por nome/código, navegação por teclado (setas, Enter, Esc).
- **Onde é usado**: `PedidoForm.tsx`, `NFeImport.tsx`, `PromocaoForm.tsx` — **o componente mais reutilizado do projeto** (3 consumidores).
- **Reutilizável?**: Sim, já é o exemplo mais maduro de reuso no código atual.
- **Deveria pertencer ao DS?**: Sim, prioridade alta — é o protótipo natural de um `Combobox`/`Autocomplete` do Design System.
- **Dependências**: nenhum componente filho.

### ProductActiveToggle
- **Arquivo**: `components/ProductActiveToggle.tsx`
- **Responsabilidade**: Botão pra inativar/reativar produto, com `confirm()` nativo do navegador antes de agir.
- **Onde é usado**: `app/produtos/[id]/page.tsx`
- **Reutilizável?**: Baixa (lógica de domínio embutida).
- **Deveria pertencer ao DS?**: Não o componente — mas o padrão "ação destrutiva com confirmação" deveria migrar para um `ConfirmDialog` do DS em vez de `window.confirm()` (ver `DESIGN_SYSTEM_ANALYSIS.md`, item Modal).
- **Dependências**: `next/navigation` (`useRouter`).

### ImportExportProducts
- **Arquivo**: `components/ImportExportProducts.tsx`
- **Responsabilidade**: Botão de exportar planilha (link direto) + botão de importar `.xlsx` (upload com input file oculto) com resultado (criados/atualizados/erros).
- **Onde é usado**: `app/produtos/page.tsx`
- **Reutilizável?**: Baixa (específico de produtos).
- **Deveria pertencer ao DS?**: Não o componente — o padrão "upload de arquivo com input oculto + botão" é candidato a um `FileUploadButton` do DS.
- **Dependências**: `next/navigation` (`useRouter`).

## Pedidos / Caixa / Entrada

### PedidoForm
- **Arquivo**: `components/PedidoForm.tsx`
- **Responsabilidade**: **O componente mais complexo do projeto.** Carrinho de compras genérico (serve tanto pra venda/"saída" quanto pra recebimento/"entrada" via prop `type`), com busca de produto, conversão UNID↔CX/PCT, cálculo de preço promocional em tempo real, trava de edição de preço por papel (funcionário não edita), forma de pagamento, e fechamento via API.
- **Onde é usado**: `app/pedidos/page.tsx` (type="OUT"), `app/entrada/page.tsx` (type="IN")
- **Reutilizável?**: Sim, via prop `type` — mas é grande demais pra um único arquivo (quase 400 linhas), candidato a quebra em subcomponentes (`CartItemRow`, `PaymentMethodSelect`) na Fase de refatoração de formulários.
- **Deveria pertencer ao DS?**: Não como um todo (é uma feature, não um primitivo) — mas deveria ser composto a partir de primitivos do DS (`Input`, `Select`, `Button`) em vez de HTML cru com classes.
- **Dependências**: `ProductAutocomplete`, `NFeImport`, `lib/pricing.ts` (`getEffectivePrice`), `lib/format.ts`.

### NFeImport
- **Arquivo**: `components/NFeImport.tsx`
- **Responsabilidade**: Upload de XML de NF-e, parse no servidor, tabela de revisão dos itens (casados automaticamente por código de barras ou vinculados manualmente), botão de adicionar tudo ao carrinho de entrada.
- **Onde é usado**: `PedidoForm.tsx` (só quando `type === "IN"`)
- **Reutilizável?**: Baixa (feature única, específica de entrada por NF-e).
- **Deveria pertencer ao DS?**: Não.
- **Dependências**: `ProductAutocomplete`, `lib/format.ts`.

### HistoricoPedidos
- **Arquivo**: `components/HistoricoPedidos.tsx`
- **Responsabilidade**: Tabela expansível de pedidos (clique na linha expande os itens), com cancelamento (dono, com confirmação nativa e fluxo de "forçar" se o cancelamento deixaria estoque negativo).
- **Onde é usado**: `app/pedidos/page.tsx`, `app/entrada/page.tsx`, `MovimentacoesToggle.tsx` (que por sua vez é usado em `app/movimentacao/page.tsx`) — **3 telas** dependem dele.
- **Reutilizável?**: Sim, já reutilizado.
- **Deveria pertencer ao DS?**: A tabela expansível ("linha mestre-detalhe") é um bom candidato a padrão de `DataTable` do DS.
- **Dependências**: `next/navigation` (`useRouter`), `lib/format.ts`.

### MovimentacoesToggle
- **Arquivo**: `components/MovimentacoesToggle.tsx`
- **Responsabilidade**: Alterna entre ver `HistoricoPedidos` de Saída ou de Entrada via 2 botões (não é uma "aba" com o padrão visual usado em Relatórios — ver `DESIGN_DEBT.md`).
- **Onde é usado**: `app/movimentacao/page.tsx`
- **Reutilizável?**: Baixa.
- **Deveria pertencer ao DS?**: O padrão de toggle deveria ser unificado com o `Tabs` usado em `RelatoriosTabs` (hoje são 2 implementações visuais diferentes pro mesmo conceito).
- **Dependências**: `HistoricoPedidos`.

## Promoções

### PromocaoForm
- **Arquivo**: `components/PromocaoForm.tsx`
- **Responsabilidade**: Formulário de criar promoção (produto via autocomplete, preço, período opcional, quantidade mínima opcional).
- **Onde é usado**: `app/promocoes/page.tsx`
- **Reutilizável?**: Não.
- **Deveria pertencer ao DS?**: Não o formulário — usa primitivos do DS.
- **Dependências**: `ProductAutocomplete`.

### PromocoesList
- **Arquivo**: `components/PromocoesList.tsx`
- **Responsabilidade**: Lista de promoções cadastradas com status calculado (Ativa/Agendada/Expirada) e botão remover.
- **Onde é usado**: `app/promocoes/page.tsx`
- **Reutilizável?**: Baixa.
- **Deveria pertencer ao DS?**: O badge de status (Ativa/Agendada/Expirada) deveria usar o primitivo `Badge`/`Pill` do DS de forma consistente com outros badges de status no app (produto ativo/inativo, estoque baixo/OK).
- **Dependências**: `lib/format.ts`.

## Filiais

### FilialForm
- **Arquivo**: `components/FilialForm.tsx`
- **Responsabilidade**: Formulário simples (1 campo: nome) pra criar filial.
- **Onde é usado**: `app/filiais/page.tsx`
- **Reutilizável?**: Não.
- **Deveria pertencer ao DS?**: Não.
- **Dependências**: nenhum componente filho.

## Relatórios (`components/relatorios/`)

### RelatoriosTabs
- **Arquivo**: `components/relatorios/RelatoriosTabs.tsx`
- **Responsabilidade**: Orquestrador de abas de Relatórios (Estoque/Rentabilidade/Faturamento/Sugestão de compra/Recorrência), decide quais abas mostrar por papel, e monta os filtros (`FilialFilter`, `PeriodoFilter`) condicionalmente por aba.
- **Onde é usado**: `app/relatorios/page.tsx` (único ponto)
- **Reutilizável?**: Não (orquestrador de página).
- **Deveria pertencer ao DS?**: O padrão visual de "pill tabs" (`rounded-full border p-1`) deveria virar o componente `Tabs` oficial do DS — hoje é a **segunda** implementação de abas do projeto sem reuso de código com `MovimentacoesToggle`.
- **Dependências**: `EstoqueAtualTable`, `RentabilidadeSection`, `FaturamentoSection`, `SugestaoCompraTable`, `RecorrenciaTable`, `PeriodoFilter`, `FilialFilter`.

### PeriodoFilter
- **Arquivo**: `components/relatorios/PeriodoFilter.tsx`
- **Responsabilidade**: Pills de período pré-definido (Hoje/7 dias/Mês/Customizado) + 2 date pickers quando customizado, manipulando `searchParams` da URL.
- **Onde é usado**: `RelatoriosTabs.tsx`
- **Reutilizável?**: Sim, o padrão poderia servir outras telas com filtro de data (nenhuma outra tela filtra por data hoje).
- **Deveria pertencer ao DS?**: Sim, como `DateRangeFilter`.
- **Dependências**: `next/navigation` (`useRouter`, `useSearchParams`).

### FilialFilter
- **Arquivo**: `components/relatorios/FilialFilter.tsx`
- **Responsabilidade**: `<select>` de filial pra filtrar relatório consolidado vs. uma filial específica (só dono, só se houver >1 filial).
- **Onde é usado**: `RelatoriosTabs.tsx`
- **Reutilizável?**: É praticamente idêntico ao `FilialSwitcher` (mesma lista de filiais, mesmo `<select>`), mas implementado separadamente porque um grava cookie e o outro grava query param. **Duplicação clara** — ver `DESIGN_DEBT.md`.
- **Deveria pertencer ao DS?**: O `<select>` sim.
- **Dependências**: `next/navigation`.

### EstoqueAtualTable / FaturamentoSection / RentabilidadeSection / RecorrenciaTable / SugestaoCompraTable
- **Arquivos**: `components/relatorios/{EstoqueAtualTable,FaturamentoSection,RentabilidadeSection,RecorrenciaTable,SugestaoCompraTable}.tsx`
- **Responsabilidade**: Cada um renderiza 1 tabela de dados de relatório (algumas com cards de KPI acima, ex.: `FaturamentoSection` e `RentabilidadeSection`). 100% tabelas HTML — nenhum gráfico.
- **Onde é usado**: Cada um só dentro de `RelatoriosTabs.tsx` (1 consumidor cada).
- **Reutilizável?**: Não reaproveitados entre si, mas têm estrutura quase idêntica (cabeçalho de tabela em uppercase + `.card`) — candidatos fortes a um único componente `DataTable` genérico parametrizado por colunas, em vez de 5 implementações quase iguais.
- **Deveria pertencer ao DS?**: A tabela-base sim; o conteúdo de cada uma (colunas específicas) não.
- **Dependências**: `lib/format.ts`.

## Resumo de reuso

| Componente | Nº de telas que o usam |
|---|---|
| `ProductAutocomplete` | 3 |
| `HistoricoPedidos` | 3 (2 diretas + 1 via `MovimentacoesToggle`) |
| `ThemeToggle` | 1 tela, 2x renderizado |
| Todos os outros | 1 |

A maior parte dos 25 componentes é de uso único — esperado numa base sem Design System, onde cada tela tende a implementar sua própria variação em vez de compor primitivos compartilhados.
