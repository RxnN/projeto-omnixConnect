# DESIGN_SYSTEM_ANALYSIS.md — Análise do Design System Atual (Omnix Connect)

> Notas de 0 a 10 avaliam o estado **atual** frente ao objetivo declarado em `DESIGN_GUIDELINES.md` (SaaS Enterprise premium, nível Stripe/Linear/Atlassian). Não existe um Design System formal hoje — o que existe é um conjunto pequeno de classes utilitárias em `app/globals.css`.

## Paleta — **4/10**

**Atual**: `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-soft`, `--border`, `--accent` (único, dourado/âmbar — `#b5651d` claro / `#d98e2b` escuro), `--ok`, `--warn`, `--danger`. Note que **`--warn` e `--accent` usam exatamente a mesma cor** (`#b5651d`/`#d98e2b`) — não há distinção visual entre "destaque de marca" e "estado de alerta".

**Guideline pede**: Primary `#1E66F5` (azul), Secondary `#081B33`, Accent `#19C2FF`, Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444`, paleta fria/tech.

**Justificativa**: a paleta atual (tons terrosos/âmbar, "adega"/vinho) foi propositalmente escolhida em uma fase anterior do produto para remeter a vinho/artesanal — funciona bem para esse contexto, mas está **na direção oposta** da paleta fria, azul, "big tech SaaS" pedida no guideline. Isso não é um defeito de execução, é uma decisão de marca que precisa ser trocada por completo. Faltam também: cor `Secondary` dedicada, e separação entre `accent` (marca) e `warn` (estado).

**Sugestões**: adotar a paleta exata do guideline como tokens `--primary`, `--secondary`, `--accent`, `--success`, `--warning`, `--danger`; nunca reaproveitar a mesma variável para marca e para estado.

## Tipografia — **5/10**

**Atual**: Manrope (display) + IBM Plex Mono (números/tabular), via `next/font/google`. Hierarquia é rasa: quase tudo usa 2-3 tamanhos (`text-sm`, `text-xs`, `text-2xl` em títulos de página) sem uma escala tipográfica documentada.

**Guideline pede**: Inter ou Plus Jakarta Sans.

**Justificativa**: Manrope é uma fonte geométrica/arredondada de boa qualidade, mas não é a recomendada; o uso de mono para números (`tabular`) é uma boa prática que vale preservar. Falta uma escala type (H1–H6, body, caption) documentada e aplicada consistentemente — hoje cada página define seu próprio `<h1 className="text-2xl font-bold">` repetido manualmente.

**Sugestões**: migrar pra Inter (mais neutra, mais "enterprise", combina com todas as referências citadas — Linear e Vercel usam Inter); criar uma escala tipográfica de 6-7 passos como tokens Tailwind (`text-display`, `text-h1`...`text-caption`) em vez de classes soltas.

## Radius — **6/10**

**Atual**: consistente na maioria dos elementos — botões e pills usam `rounded-full`, cards/inputs usam `rounded-xl`/`rounded-lg`. Não há uma variável de radius nomeada (é hardcoded em cada classe `@apply`).

**Justificativa**: a consistência visual já existe na prática, mas não está tokenizada — trocar o radius do produto inteiro hoje exigiria editar `globals.css` classe por classe.

**Sugestões**: extrair `--radius-sm/md/lg/full` como tokens e referenciar neles.

## Spacing — **5/10**

**Atual**: usa a escala padrão do Tailwind (múltiplos de 4px: `p-4`, `gap-2`, `py-2.5` etc.), o que tecnicamente já é uma escala de 8px com meio-passos. Porém o guideline pede explicitamente "espaçamento baseado em escala de 8px" como regra documentada — hoje não há essa documentação, e há inconsistências pontuais (`py-2.5` vs `py-2` vs `py-3` usados de forma intercambiável entre componentes parecidos).

**Sugestões**: documentar a escala de 8px oficialmente e fazer uma varredura de normalização (ver `DESIGN_DEBT.md`).

## Grid — **4/10**

**Atual**: não existe um grid de layout definido — cada página usa `max-w-6xl mx-auto` (herdado do `<main>` do layout raiz) e depois grids ad-hoc (`grid sm:grid-cols-2`, `grid sm:grid-cols-3`, `grid sm:grid-cols-4`) sem uma lógica de colunas consistente entre páginas parecidas (ex: KPIs em Produtos usam 2 colunas, KPIs em Faturamento usam 3, KPIs em Rentabilidade usam 4).

**Sugestões**: definir um grid de 12 colunas (ou 4/8/12 responsivo) como padrão de composição de página, com breakpoints documentados.

## Cards — **6/10**

**Atual**: uma única classe `.card`/`.panel` (idênticas) cobre praticamente todo container do app — cabeçalho de página, formulário, tabela, KPI (`.kpi` é quase igual, com `p-4` em vez de `p-5`). É simples e consistente, mas raso: não há elevação (sombra) nenhuma, nem variantes (card interativo/hover, card destacado).

**Guideline pede**: "sombras leves".

**Sugestões**: adicionar 1-2 níveis de elevação sutil (`shadow-sm` em hover de cards clicáveis, por exemplo), e formalizar `.card`/`.kpi` como o mesmo componente com uma prop de densidade em vez de 2 classes CSS quase duplicadas.

## Buttons — **6/10**

**Atual**: 3 variantes via classe (`.btn-primary`, `.btn-secondary`, `.btn-danger`), todas `rounded-full`, com estado `disabled` consistente. Não há variante de tamanho (sm/md/lg) nem variante "ghost"/"link", nem estado de loading padronizado (cada componente escreve seu próprio "Salvando..."/"Criando..." como texto condicional).

**Sugestões**: formalizar como componente `<Button variant size loading>` do DS, com spinner em vez de troca de texto.

## Inputs — **6/10**

**Atual**: uma única classe `.input` cobre text/number/date/select/textarea. Foco visível existe (`focus:ring-2` com cor de accent) — ponto positivo para acessibilidade. Não há estado de erro visual no próprio campo (erros aparecem como texto solto abaixo do formulário inteiro, não por campo) nem estado de sucesso/validação.

**Sugestões**: adicionar variante de erro (borda vermelha + mensagem inline por campo), padronizar `<select>` nativo com um chevron custom (hoje é o dropdown nativo do SO, quebrando a estética enterprise).

## Tables — **5/10**

**Atual**: HTML `<table>` cru estilizado via classes inline repetidas em 6+ componentes diferentes (cabeçalho uppercase cinza, `divide-y`, hover não existe em linhas). Nenhuma tabela tem: ordenação por coluna, paginação, densidade configurável, ou estado vazio ilustrado (é sempre um texto simples "Nenhum X ainda").

**Sugestões**: um componente `DataTable` único e reutilizável (ver `COMPONENT_INVENTORY.md`) com estados vazio/loading/erro padronizados, e considerar paginação quando o histórico de pedidos crescer.

## Sidebar — **6/10**

**Atual**: `NavBar.tsx` já é "compacta" (w-60) e o item ativo é destacado com fundo sólido `--accent` — atende ao pedido do guideline ("compacta, moderna, item ativo bem destacado"). O que falta: os ícones são SVGs escritos à mão em vez de uma lib (Lucide/Tabler/Phosphor conforme pedido), e não há colapso/recolhimento da sidebar em telas maiores (só existe o padrão drawer para mobile).

**Sugestões**: trocar ícones por Lucide; considerar sidebar colapsável (ícone-only) para notebooks pequenos.

## Navbar — **5/10**

Ver Sidebar acima — no mobile, a barra superior compacta duplica o nome da empresa e o `ThemeToggle` (já renderizados de novo dentro do drawer), gerando redundância de DOM e potencial confusão de manutenção.

## Dropdown — **3/10**

**Atual**: **não existe um dropdown customizado em lugar nenhum do app.** Todo "dropdown" é um `<select>` HTML nativo (filial, forma de pagamento, categoria de produto, tipo de embalagem). Funcional e acessível por padrão do navegador, mas visualmente destoa muito de produtos como Linear/Stripe (que usam dropdowns customizados com busca, ícones, grupos).

**Sugestões**: introduzir um componente `Select`/`Dropdown` (Radix UI recomendado) mantendo a semântica acessível nativa.

## Modal — **1/10**

**Atual**: **não existe um componente de modal.** Toda confirmação usa `window.confirm()` (inativar produto, cancelar pedido) e toda mensagem de bloqueio usa `window.alert()` — APIs nativas do navegador, não estilizáveis, que quebram completamente a identidade visual do produto no momento mais crítico (uma ação destrutiva).

**Sugestões**: prioridade alta — criar `ConfirmDialog`/`Modal` no Design System (Radix Dialog é a base recomendada) e substituir todo `confirm()`/`alert()`.

## Toast — **1/10**

**Atual**: **não existe um sistema de toast/notificação.** Mensagens de sucesso e erro são parágrafos (`<p>`) inseridos no fluxo da própria página, que empurram o layout e desaparecem só quando o usuário navega ou tenta de novo — não há timeout automático, nem empilhamento de múltiplas mensagens, nem posição fixa (ex: canto superior direito).

**Sugestões**: prioridade alta — introduzir `sonner` ou toast do Radix, com variantes success/error/warning consistentes com a paleta do DS.

## Charts — **0/10**

**Atual**: **não existe nenhum gráfico no produto.** `/relatorios` — que deveria ser o "Dashboard" citado no guideline — é 100% tabelas e cards de KPI numérico. Nenhuma lib de gráficos está instalada.

**Sugestões**: prioridade alta para a fase "Refatorar Dashboard" do `ROADMAP.md` — no mínimo um gráfico de linha (faturamento ao longo do tempo) e um de barras (ranking de produtos) usando Recharts ou Tremor.

## Badges — **6/10**

**Atual**: classe `.pill` com 4 variantes de cor (`ok`/`warn`/`danger`/`muted`), usada para status de estoque, status de pedido cancelado, status de produto inativo, status de promoção, e faixa de margem em Rentabilidade. É o primitivo mais consistente do projeto hoje.

**Sugestões**: já está em bom caminho — só precisa migrar as cores da paleta nova e virar componente formal `<Badge variant>` em vez de classe CSS solta.

## Ícones — **2/10**

**Atual**: cada ícone é um `<svg><path d="..."/></svg>` escrito manualmente inline dentro de `NavBar.tsx` (dicionário `ICONS` por rota) — não há consistência garantida de stroke-width, tamanho, ou estilo (alguns têm cantos mais arredondados que outros por terem sido copiados de fontes diferentes). Fora da NavBar, praticamente não há ícones no resto do app (nem em botões, nem em estados vazios, nem em KPIs).

**Guideline pede**: Lucide/Tabler/Phosphor.

**Sugestões**: prioridade alta — adotar Lucide React (ver `DEPENDENCY_REPORT.md`) e usar ícones de forma mais generosa em toda a interface (estados vazios, KPIs, botões de ação).

## Motion — **4/10**

**Atual**: só `transition-colors`/`transition-transform` do Tailwind em hovers e no drawer mobile (translate-x). Nenhuma transição de entrada/saída de página, nenhuma micro-animação em cards, nenhum skeleton/loading state visual (loading é só texto "Carregando...").

**Guideline pede**: "transições de 150-250ms, sem exagero" — o pouco que existe já respeita esse princípio (bom sinal), só falta cobertura.

**Sugestões**: adicionar transições de fade/slide em modais e toasts (quando existirem), skeleton loaders para tabelas/KPIs durante fetch.

## Dark Mode — **7/10**

**Atual**: é, de longe, o item mais bem executado do projeto. Implementação em 3 camadas (`prefers-color-scheme` como fallback, `data-theme` explícito via toggle, persistido em `localStorage`) é tecnicamente sólida e evita flash de tema errado (script inline no `<head>`). As cores do dark mode já são pensadas como paleta própria (não é uma inversão automática), o que bate exatamente com o princípio do guideline ("Dark Mode NÃO é uma inversão do tema claro").

**Justificativa da nota não ser mais alta**: a paleta em si (âmbar/terroso) precisa ser trocada pela paleta fria do guideline, mas a **arquitetura técnica** do dark mode é reaproveitável quase 100% no redesign.

**Sugestões**: manter a arquitetura, só trocar os valores de token.

## Responsividade — **6/10**

**Atual**: existe tratamento mobile real (drawer de navegação, grids que colapsam com `sm:`), o que é um ponto forte incomum nesse estágio de produto. Breakpoints usados são só `sm:`/`md:`/`lg:` (Tailwind padrão) — não há um breakpoint dedicado pra tablet testado explicitamente, e tabelas largas (Relatórios, Histórico de Pedidos) dependem de scroll horizontal (`overflow-x-auto`) em vez de uma versão mobile-first (cards empilhados).

**Guideline pede**: "Desktop, notebook, tablet e celular" — os 4 breakpoints.

**Sugestões**: testar/ajustar especificamente em tablet (768-1024px); considerar visão em cards para tabelas densas em telas pequenas.

## Acessibilidade — **3/10**

**Atual**: pontos positivos isolados (foco visível nos inputs via `:focus-visible`/`ring`, `aria-label` em alguns botões de ícone, navegação por teclado no `ProductAutocomplete`). Pontos graves: `window.confirm()`/`alert()` nativos (ao menos são acessíveis por padrão do SO, mas inconsistentes com o resto); nenhum teste de contraste documentado; várias cores de texto (`--ink-soft`) usadas para informação importante sem garantia de atingir 4.5:1 (WCAG AA); ícones da NavBar não têm texto alternativo quando o link já tem label textual ao lado (ok), mas botões só-ícone (fechar menu, toggle de tema) dependem 100% do `aria-label`/`title` sem `<VisuallyHidden>` de fallback.

**Guideline pede**: WCAG AA, foco visível, contraste adequado, navegação por teclado.

**Sugestões**: prioridade alta — auditoria de contraste de cor por cor assim que a paleta nova for definida; adotar componentes acessíveis por padrão (Radix) em vez de reconstruir do zero.

---

## Resumo das notas

| Categoria | Nota |
|---|---|
| Paleta | 4/10 |
| Tipografia | 5/10 |
| Radius | 6/10 |
| Spacing | 5/10 |
| Grid | 4/10 |
| Cards | 6/10 |
| Buttons | 6/10 |
| Inputs | 6/10 |
| Tables | 5/10 |
| Sidebar | 6/10 |
| Navbar | 5/10 |
| Dropdown | 3/10 |
| Modal | 1/10 |
| Toast | 1/10 |
| Charts | 0/10 |
| Badges | 6/10 |
| Ícones | 2/10 |
| Motion | 4/10 |
| Dark Mode | 7/10 |
| Responsividade | 6/10 |
| Acessibilidade | 3/10 |
| **Média geral** | **4.4/10** |

O maior gap não é "qualidade de execução" (o que existe é limpo e consistente dentro do que cobre) — é **cobertura**: faltam categorias inteiras (Modal, Toast, Charts, Ícones de verdade) que qualquer produto "nível Stripe/Linear" exige.
