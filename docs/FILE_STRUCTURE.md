# FILE_STRUCTURE.md — Organização do Front-end (Omnix Connect)

> Auditoria da camada de apresentação. Nenhum código foi alterado para produzir este documento.

## Visão geral

O projeto é um app **Next.js 14 (App Router)** com React 18 + TypeScript, estilizado com **Tailwind CSS** sobre um punhado de classes utilitárias customizadas em `app/globals.css` (não existe biblioteca de componentes de UI — tudo é HTML/JSX + Tailwind + CSS variables escritas à mão). Não há Storybook, não há testes de front-end (o Vitest existente cobre só lógica de backend/repo), e não há pasta de design tokens dedicada.

```
adegas-app/
├── app/                      # Rotas (App Router) — cada pasta = 1 rota
│   ├── layout.tsx            # Layout raiz (shell: NavBar + SubscriptionBanner + <main>)
│   ├── globals.css           # ÚNICO arquivo de estilo do projeto inteiro
│   ├── page.tsx               → "/"                  (login)
│   ├── cadastro/page.tsx      → "/cadastro"
│   ├── acesso-negado/page.tsx → "/acesso-negado"
│   ├── aguardando-aprovacao/page.tsx → "/aguardando-aprovacao"
│   ├── pedidos/page.tsx       → "/pedidos"            (Caixa — venda)
│   ├── entrada/page.tsx       → "/entrada"            (recebimento de mercadoria)
│   ├── movimentacao/page.tsx  → "/movimentacao"       (histórico consolidado)
│   ├── produtos/
│   │   ├── page.tsx           → "/produtos"
│   │   ├── novo/page.tsx      → "/produtos/novo"
│   │   └── [id]/
│   │       ├── page.tsx       → "/produtos/[id]"
│   │       └── editar/page.tsx→ "/produtos/[id]/editar"
│   ├── promocoes/page.tsx     → "/promocoes"
│   ├── filiais/page.tsx       → "/filiais"
│   ├── relatorios/page.tsx    → "/relatorios"
│   └── api/                   # Route handlers (fora do escopo desta auditoria de UI)
├── components/                # TODOS os componentes de UI, em um único diretório plano
│   └── relatorios/             # Único subdiretório — específico da tela de Relatórios
├── lib/                       # Lógica de negócio, tipos, formatação — não é UI
│   ├── format.ts               # formatBRL, formatDateShort, formatDateTime, formatPaymentMethod
│   ├── pricing.ts               # getEffectivePrice (consumido por 1 componente de UI: PedidoForm)
│   └── types.ts                 # Tipos compartilhados (Product, Pedido, Promotion, Filial, User...)
├── tailwind.config.ts
└── prisma/                     # Fora do escopo (backend)
```

## Pages

Todas as rotas ficam em `app/`, seguindo a convenção do Next App Router (`page.tsx` por pasta). Não há agrupamento por `(route-groups)` nem por domínio — é uma lista plana de 14 rotas. Ver `PAGE_INVENTORY.md` para o detalhamento completo.

## Layouts

Existe **um único layout**: `app/layout.tsx` (raiz, aplicado a todo o app). Não há layouts aninhados por seção (`/produtos/layout.tsx`, `/relatorios/layout.tsx` etc. não existem) — cada página monta seu próprio cabeçalho (`<h1>` + parágrafo de descrição) manualmente, de forma repetida em quase todas as 14 páginas (ver `DESIGN_DEBT.md`).

O layout raiz delega a decisão "mostrar ou não a barra lateral" para `components/AppShell.tsx` (client component), que verifica a rota atual (`usePathname`) para esconder o menu em `/` e `/cadastro`.

## Components

`components/` é um diretório **plano** com 18 arquivos + 1 subpasta (`relatorios/`, com mais 7). Não há subpastas por tipo (`ui/`, `forms/`, `layout/`) nem por domínio (`produtos/`, `pedidos/`), exceto a exceção de Relatórios. Isso significa que, conforme o app cresce, esse diretório tende a virar uma lista longa e difícil de escanear — já são 25 arquivos hoje.

Nenhum componente é genuinamente "base" (não existe `Button.tsx`, `Input.tsx`, `Card.tsx`, `Table.tsx`, `Modal.tsx`, `Badge.tsx` etc.) — os "primitivos" visuais existem apenas como **classes CSS** (`.btn-primary`, `.input`, `.card`, `.pill`) aplicadas diretamente em `<button>`, `<input>`, `<div>` cru em cada componente. Ver `COMPONENT_INVENTORY.md` e `DESIGN_SYSTEM_ANALYSIS.md`.

## Hooks

**Não existem hooks customizados.** Todo estado é `useState`/`useEffect` local dentro de cada componente client (`"use client"`). Lógica repetida entre componentes (ex: padrão de fetch + loading + error + success já aparece de forma quase idêntica em `LoginForm`, `CadastroForm`, `FilialForm`, `PromocaoForm`, `ImportExportProducts`, `ProductActiveToggle`) não foi extraída em um hook compartilhado (ex: `useAsyncAction`).

## Contexts / Providers

**Não existem.** Não há `React.Context`, nem Redux/Zustand/Jotai. O estado "global" (usuário logado, filial ativa) é resolvido no servidor a cada requisição (via cookies + Prisma) e passado por props através da árvore de Server Components — o que é uma escolha legítima em Next App Router, mas significa que qualquer estado de UI que precise ser compartilhado entre componentes client distantes (ex: tema claro/escuro) usa `localStorage` + `document.documentElement.dataset` diretamente, sem um único ponto de verdade em React.

## Services

Não há uma camada `services/` no front-end. Toda chamada de API é um `fetch()` inline dentro do componente que precisa dela (ex: `PedidoForm.closePedido`, `NFeImport.handleFileChange`). Não existe um cliente HTTP compartilhado (nem um wrapper simples tipo `apiClient.post(url, body)`), então tratamento de erro, parsing de JSON e mensagens de erro são reimplementados em cada componente.

## Utils

`lib/format.ts` e `lib/pricing.ts` cumprem esse papel, mas moram em `lib/` (junto com lógica de backend/Prisma), não em uma pasta dedicada a utilitários de front-end. Não há separação entre "utils de UI" e "lógica de domínio".

## Assets

**Não existem.** Não há pasta `public/` com imagens, não há logo em SVG/PNG — a identidade visual inteira se resume ao emoji 🍷 usado como "logo" em duas telas (login, cadastro) e nenhum outro lugar. Não há favicon customizado além do padrão do Next.

## Styles

Um único arquivo: `app/globals.css` (179 linhas). Contém:
- Tokens de cor via CSS variables (`:root`, bloco `@media (prefers-color-scheme: dark)`, e overrides `[data-theme="dark"]`/`[data-theme="light"]`)
- ~10 classes utilitárias customizadas com `@apply` (`.btn`, `.card`, `.input`, `.pill`, `.kpi`, `.label`, `.tabular`)

Não há CSS Modules, não há Styled Components, não há arquivo por componente — é 100% Tailwind utilitário + essas ~10 classes globais.

## Libs

`lib/` mistura, no mesmo diretório: tipos compartilhados (`types.ts`), formatação de UI (`format.ts`, `pricing.ts`), autenticação/sessão (`auth.ts`, `session.ts`), acesso a dados (`repo/`), regras de negócio (`reports.ts`, `validation.ts`) e infraestrutura (`prisma.ts`, `rate-limit.ts`). Do ponto de vista de front-end, isso é irrelevante para a UI em si, mas dificulta saber, batendo o olho, o que é "usado pela tela" vs "usado só pelo servidor".

## Conclusão da organização

A estrutura é típica de um MVP em crescimento rápido: pragmática, sem camadas desnecessárias, mas sem nenhuma camada de Design System. Isso é esperado e aceitável numa fase inicial — é exatamente a lacuna que o redesign deve preencher (ver `ROADMAP.md`, fase "Design Tokens" e "Refatorar componentes base").
