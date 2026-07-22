# UI_AUDIT.md — Auditoria de Interface (Omnix Connect)

> Auditoria da camada de apresentação apenas. Backend, regras de negócio e dados não são objeto deste documento, exceto onde afetam diretamente o que o usuário vê.

## Visão geral da interface

O produto é um sistema operacional de PDV/estoque para pequenos negócios (hoje adegas/distribuidoras de bebida, com o modelo de dados já generalizado para multi-filial). A interface é funcional, limpa e consistente **dentro do que já foi construído**, com uma implementação de dark mode surpreendentemente madura para o estágio do produto. Ao mesmo tempo, ela está visualmente distante do posicionamento "SaaS Enterprise premium" descrito em `DESIGN_GUIDELINES.md`: não há Dashboard, não há gráficos, não há ícones de biblioteca, não há modais/toasts customizados, e a paleta de cores (tons terrosos/âmbar) comunica um produto artesanal/boutique, não um SaaS de gestão comercial "confiável e escalável".

Em suma: a **arquitetura de informação e os fluxos** são sólidos; a **camada visual** precisa de um redesign completo, que é exatamente o que este conjunto de documentos prepara.

## Pontos fortes

1. **Consistência de primitivos básicos**: `.btn`, `.card`, `.input`, `.pill` são usados de forma disciplinada em todo o app — não há botões ou cards "fora do padrão" espalhados pelo código.
2. **Dark Mode tecnicamente sólido**: 3 camadas (preferência do SO, override explícito, persistência), sem flash de tema errado, com paleta própria (não é inversão automática).
3. **Responsividade real**: drawer de navegação mobile funcional, grids que colapsam, testado ao menos em desktop/mobile.
4. **Reuso real onde importa**: `ProductAutocomplete` e `HistoricoPedidos` já são compartilhados entre múltiplas telas.
5. **Feedback de erro/sucesso presente em todo formulário** (mesmo que a apresentação — texto solto — não seja ideal, a informação chega ao usuário).
6. **Escopo de permissão refletido na UI**: menu, abas de relatório e ações mudam corretamente conforme o papel do usuário (dono/gerente/funcionário), sem vazar controles que o usuário não pode usar.
7. **Estados vazios existem** (nenhuma tela quebra ou fica em branco sem dado — sempre há uma mensagem tipo "Nenhum produto cadastrado ainda").

## Pontos fracos

1. **Nenhum Dashboard** — a "home" pós-login (`/pedidos`) é uma tela operacional (fechar venda), não uma visão executiva. `/relatorios` mais se aproxima de um dashboard, mas é só tabelas.
2. **Zero gráficos** em um produto de gestão comercial — decisões de compra/estoque dependem inteiramente de leitura de tabela.
3. **Modal e Toast substituídos por APIs nativas do navegador** (`confirm()`/`alert()`) — o momento de maior risco (ação destrutiva) tem a pior apresentação visual do produto.
4. **Nenhuma biblioteca de ícones** — ícones são SVGs manuais, presentes só na sidebar.
5. **Paleta na direção oposta** ao posicionamento de marca desejado (terrosa vs. fria/tech).
6. **Cabeçalho de página duplicado manualmente em ~13 arquivos** (`<h1>` + `<p>` de descrição) — nenhum componente `PageHeader` compartilhado.
7. **2 implementações visuais diferentes de "abas"** (`RelatoriosTabs` vs. `MovimentacoesToggle`) para o mesmo conceito.
8. **2 implementações quase idênticas de seletor de filial** (`FilialSwitcher` vs. `FilialFilter`).

## Problemas de UX

- **Confirmação de ações destrutivas via `window.confirm()`**: interrompe o fluxo com um diálogo do sistema operacional, sem poder explicar a consequência com mais contexto visual (ex: cancelar pedido com estoque insuficiente).
- **Erros de formulário não são posicionados por campo**: o usuário precisa ler o texto de erro genérico e adivinhar qual campo corrigir, em vez de ver a borda vermelha no campo específico.
- **Nenhuma indicação visual de "promoção" na tela de Pedidos até o item já estar no carrinho** — o vendedor só descobre que um produto está em promoção depois de adicioná-lo (o selo "em promoção" só existe em `/produtos`, não na busca do `PedidoForm`).
- **Sem paginação em nenhuma tabela** — o histórico de pedidos, ao crescer, vai depender só de "limit" no backend sem forma de o usuário navegar para itens mais antigos pela UI.
- **Credenciais de demonstração fixas na tela de login** (texto estático) — não é claramente removível/configurável, risco de ficar desatualizado ou confuso conforme o produto evolui (achado observado diretamente durante a auditoria: o texto listava contas que não correspondiam mais ao estado real do banco).

## Problemas de UI

- Botões `disabled` mudam só opacidade — sem cursor `not-allowed` visualmente reforçado em todos os casos.
- `<select>` nativos (filial, forma de pagamento, categoria) quebram a identidade visual custom do resto da tela — o dropdown do sistema operacional aparece sem nenhuma estilização.
- KPIs usam grids de tamanhos diferentes em cada tela (2, 3 ou 4 colunas) sem um padrão de composição.
- Nenhuma sombra/elevação — todo container tem a mesma "altura" visual (borda + fundo), dificultando hierarquia entre card principal e card secundário.

## Problemas de consistência

- Espaçamento vertical de seção (`space-y-4` vs `space-y-6`) varia sem regra clara aparente entre páginas semelhantes.
- Padding de botão/pill hardcoded em cada classe, não relacionado entre si por uma escala.
- `--warn` e `--accent` compartilham a mesma cor — um elemento "de marca" (destaque) e um elemento "de alerta" (atenção) são visualmente idênticos, o que é uma inconsistência semântica, não só estética.
- Tabelas de relatório e o histórico de pedidos usam o mesmo estilo de cabeçalho, mas com pequenas variações de padding (`px-4 py-2` vs `px-3 py-1.5`) sem motivo funcional aparente.

## Problemas de acessibilidade

- Ações destrutivas dependem de `window.confirm()` — funcional para leitores de tela (é nativo do SO), mas fora do controle visual/de marca do produto.
- Não há indicação clara de contraste testado (WCAG AA) para `--ink-soft` sobre `--surface-2` em ambos os temas.
- Nenhum "skip to content" ou landmark ARIA explícito além da semântica HTML padrão (`<nav>`, `<main>`) já presente.
- Toasts/mensagens de erro/sucesso não usam `aria-live`, então leitores de tela podem não anunciar automaticamente o resultado de uma ação (ex: "Pedido fechado com sucesso").

## Problemas de responsividade

- Tabelas densas (Relatórios, Histórico de Pedidos, NF-e) dependem 100% de scroll horizontal em telas pequenas — sem uma versão empilhada/cards para mobile.
- Sem breakpoint dedicado testado para tablet (768–1024px); o app "salta" diretamente de mobile pra desktop na maioria dos grids (`sm:` cobre a partir de 640px, mas o layout de shell só muda de fato em `md:` — 768px).

## Problemas de organização

- `components/` é um diretório plano com 18 arquivos (+ 7 em `relatorios/`), sem subpastas por domínio ou tipo — dificulta escaneabilidade conforme o app cresce.
- Não há camada de Design System nem pasta de tokens — tokens de cor vivem soltos em `globals.css` sem documentação.
- Não há hooks/services compartilhados — cada componente reimplementa o próprio padrão de fetch + loading + erro.

## Oportunidades de melhoria

Ver `REFACTOR_OPPORTUNITIES.md` para a lista priorizada completa. Os itens de maior alavancagem, resumidos:
1. Introduzir tokens de Design System (paleta nova + tipografia + spacing documentado).
2. Substituir `confirm()`/`alert()` por `Dialog`/`Toast` reais.
3. Adotar uma lib de ícones.
4. Construir um Dashboard de verdade com pelo menos 1-2 gráficos.
5. Consolidar componentes duplicados (Tabs, seletor de filial, cabeçalho de página, tabela genérica).

## Resumo executivo

A Omnix Connect tem uma **base funcional sólida e sem dívida técnica estrutural grave** — os fluxos fazem sentido, os dados certos aparecem no lugar certo, e há disciplina básica de reuso onde importa. O que falta é inteiramente do domínio visual: a marca atual (paleta terrosa, sem ícones, sem gráficos, sem modal/toast customizado) não comunica "SaaS Enterprise premium" e está a vários passos de distância das referências citadas (Stripe, Linear, Atlassian). Isso é, na prática, uma boa notícia para o projeto de redesign: não é necessário reescrever lógica nem fluxos — é possível (e recomendado) seguir a ordem definida em `CLAUDE.md`/`ROADMAP.md` (tokens → componentes base → sidebar/topbar → dashboard → formulários → tabelas → páginas → dark mode → microinterações) sem tocar em nenhuma regra de negócio.
