# DEPENDENCY_REPORT.md — Dependências (Omnix Connect)

> Baseado em `package.json`. Sem alterações de código/dependências realizadas.

## Dependências de produção

| Biblioteca | Versão | Finalidade | Relevante pra UI? |
|---|---|---|---|
| `next` | ^14.2.35 | Framework (App Router, roteamento, SSR) | Sim — base de tudo |
| `react` / `react-dom` | ^18.3.1 | UI runtime | Sim |
| `zod` | ^4.4.3 | Validação de formulários/API | Indireto (mensagens de erro exibidas na UI) |
| `iron-session` | ^8.0.4 | Sessão criptografada em cookie | Não (backend) |
| `@prisma/client` | ^6.19.3 | ORM | Não (backend) |
| `bcryptjs` | ^2.4.3 | Hash de senha | Não (backend) |
| `fast-xml-parser` | ^5.10.1 | Parse de XML de NF-e | Não (backend, usado por `NFeImport` indiretamente via API) |
| `xlsx` | ^0.18.5 | Import/export de planilha | Não (backend) |

## Dependências de desenvolvimento

| Biblioteca | Versão | Finalidade |
|---|---|---|
| `tailwindcss` | ^3.4.13 | Estilização utilitária |
| `autoprefixer` / `postcss` | — | Pipeline do Tailwind |
| `typescript` | ^5.5.4 | Tipagem |
| `vitest` | ^4.1.10 | Testes (só lógica de backend hoje) |
| `tsx` | ^4.19.1 | Execução de scripts TS (seed, migrações) |
| `@types/*` | — | Tipos |

## O que está notavelmente ausente

A `DESIGN_GUIDELINES.md` menciona explicitamente referências (Stripe, Linear, Atlassian...), ícones "Lucide/Tabler/Phosphor" e um Dashboard "inspirado em Stripe, HubSpot e Microsoft Fabric" com "KPIs, gráficos, rankings". Nenhuma dependência abaixo existe hoje:

| Categoria | O que falta | Impacto atual |
|---|---|---|
| **Ícones** | Nenhuma lib de ícones (Lucide, Tabler, Phosphor, Heroicons) | Todo ícone é um `<svg><path d="..."/></svg>` escrito à mão inline em `NavBar.tsx`. Inconsistente, difícil de manter, sem tree-shaking real de um sistema de ícones |
| **Gráficos** | Nenhuma lib de charts (Recharts, Chart.js, Tremor, Visx) | `/relatorios` é 100% tabelas HTML + cards de KPI numérico. Nenhum gráfico de linha/barra em lugar nenhum do app, apesar do guideline pedir "gráficos" no Dashboard |
| **Componentes de UI headless** | Nenhuma (Radix UI, Headless UI, Ariakit) | Todo `<select>`, modal (`confirm()`/`alert()` nativos do browser!), dropdown é HTML nativo sem estilização rica nem acessibilidade garantida |
| **Animação** | Nenhuma (Framer Motion, `tailwindcss-animate`) | As poucas transições existentes são `transition-colors`/`transition-transform` CSS puro (ok para o guideline "150-250ms, sem exagero", mas não há microinterações de entrada/saída, toasts animados etc.) |
| **Toasts/Notificações** | Nenhuma (Sonner, react-hot-toast) | Mensagens de sucesso/erro são `<p>` estático inserido no fluxo da página, ou pior, `alert()`/`confirm()` nativos do navegador (`ProductActiveToggle.tsx`, `HistoricoPedidos.tsx`) |
| **Formulários** | Nenhuma (React Hook Form, Formik) | Cada formulário reimplementa `useState` por campo + validação manual à mão |
| **Fontes** | `next/font/google` (Manrope + IBM Plex Mono) já em uso | Guideline pede "Inter ou Plus Jakarta Sans" — fonte atual diverge da recomendação |

## Dependências recomendadas para o redesign

Prioridade alta (habilitam itens explícitos do `DESIGN_GUIDELINES.md`):
1. **Ícones**: `lucide-react` (leve, tree-shakeable, combina com a referência visual Linear/Vercel citada no guideline)
2. **Gráficos**: `recharts` ou `tremor` (Tremor já vem com componentes de dashboard prontos no estilo "Stripe/HubSpot" citado)
3. **Componentes headless + acessíveis**: `@radix-ui/react-*` (dialog, dropdown-menu, select, toast) — resolve modal/dropdown/toast de uma vez, com acessibilidade (foco, teclado, ARIA) de fábrica, que hoje **não existe**
4. **Toasts**: `sonner` (se não vier via Radix)

Prioridade média:
5. `class-variance-authority` + `clsx`/`tailwind-merge` — para variantes de componente (Button primary/secondary/danger, tamanhos) sem duplicar classes manualmente como hoje (`.btn-primary`, `.btn-secondary`, `.btn-danger` como classes CSS fixas em vez de props)
6. `react-hook-form` + `@hookform/resolvers` (integra com o `zod` que já existe no projeto) — reduz o boilerplate repetido de `useState` por campo

Prioridade baixa (polish):
7. `framer-motion` — só se as microinterações do guideline exigirem animação além de CSS transitions

## Dependências desnecessárias / a revisar

Nenhuma dependência de UI está claramente desnecessária hoje — a lista é enxuta a ponto de faltar ferramentas, não sobrar. Duas observações de manutenção (não é escopo desta auditoria de UI resolver, apenas registrar):
- `xlsx` (^0.18.5) tem CVEs conhecidas publicamente documentadas (prototype pollution / ReDoS) — já sinalizado em sessão anterior deste projeto, não corrigido por exigir mudança de biblioteca com potencial breaking change.
- `next` ^14.2.35 — Next 15 já é estável; migração é uma decisão de arquitetura (fora do escopo desta etapa, que é só front-end visual).
