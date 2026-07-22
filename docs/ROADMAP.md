# ROADMAP.md — Planejamento do Redesign (Omnix Connect)

> Segue a "Ordem obrigatória" definida em `CLAUDE.md` (14 fases, de Design Tokens até Revisão Visual Completa). Este documento é só planejamento — nenhuma fase foi executada. Cada fase referencia os achados relevantes de `UI_AUDIT.md`, `DESIGN_SYSTEM_ANALYSIS.md`, `DESIGN_DEBT.md` e `REFACTOR_OPPORTUNITIES.md`.

## Fase 1 — Analisar toda a arquitetura
**Objetivo**: compreender 100% da estrutura de páginas, componentes e Design System atual antes de tocar em qualquer código.
**Impacto**: base de todas as decisões seguintes; risco de retrabalho se pulada.
**Dependências**: nenhuma.
**Prioridade**: Crítica.
**Status**: ✅ Concluída nesta etapa — resultado é este conjunto de 13 documentos + `/docs/export`.

## Fase 2 — Identificar componentes reutilizados
**Objetivo**: mapear o que já é compartilhado entre telas (`ProductAutocomplete`, `HistoricoPedidos`) vs. o que está duplicado (Tabs, seletor de filial) vs. o que deveria existir e não existe (Modal, Toast, DataTable, PageHeader).
**Impacto**: evita recriar componentes que já funcionam; evita perpetuar duplicações.
**Dependências**: Fase 1.
**Prioridade**: Alta.
**Status**: ✅ Concluída — ver `COMPONENT_INVENTORY.md` e `DESIGN_DEBT.md`.

## Fase 3 — Criar Design System centralizado
**Objetivo**: estabelecer a pasta/estrutura de Design System (ex: `components/ui/` ou equivalente) com os primitivos que faltam hoje: `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`/`Dialog`, `Toast`, `Tabs`, `DataTable`, `PageHeader`, `KpiGrid`.
**Impacto**: é o maior alavancador de todo o roadmap — praticamente toda página será refatorada em cima disso nas fases seguintes.
**Dependências**: Fases 1-2.
**Prioridade**: Crítica.

## Fase 4 — Criar tokens globais
**Objetivo**: substituir a paleta terrosa atual pela paleta fria do `DESIGN_GUIDELINES.md` (Primary `#1E66F5`, Secondary `#081B33`, Accent `#19C2FF`, Success/Warning/Danger), tokens de tipografia (Inter/Plus Jakarta Sans), radius, espaçamento em escala de 8px, e tokens de sombra — em `app/globals.css` e `tailwind.config.ts`.
**Impacto**: primeira mudança visível de marca; afeta 100% das telas de uma vez (efeito cascata, já que os componentes usam CSS variables).
**Dependências**: Fase 3 (estrutura pronta para receber os tokens).
**Prioridade**: Crítica.

## Fase 5 — Refatorar componentes base
**Objetivo**: implementar/migrar `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Toast` com os novos tokens, incluindo os itens de acessibilidade pendentes (estado de erro por campo, foco visível, `aria-live` em toasts).
**Impacto**: resolve os itens de prioridade Alta de `REFACTOR_OPPORTUNITIES.md` (#2 Modal, #3 Toast) e eleva a nota de Acessibilidade (`UI_METRICS.md`, hoje 3/10).
**Dependências**: Fase 4.
**Prioridade**: Crítica.

## Fase 6 — Refatorar Sidebar
**Objetivo**: `NavBar.tsx` com nova paleta, ícones de biblioteca (Lucide) em vez de SVG manual, e revisão da duplicação de `ThemeToggle` (hoje renderizado 2x — `DESIGN_DEBT.md` #8).
**Impacto**: primeira impressão visual pós-login para 100% dos usuários autenticados.
**Dependências**: Fases 4-5.
**Prioridade**: Alta.

## Fase 7 — Refatorar Topbar
**Objetivo**: hoje não existe uma "topbar" separada — a barra superior só aparece no mobile (versão compacta da sidebar). Definir se o redesign introduz uma topbar real em desktop (ex: breadcrumb, busca global, avatar/menu de usuário) ou mantém o padrão atual de sidebar-only.
**Impacto**: espaço natural para funcionalidades hoje ausentes (menu de usuário/configurações — ver lacuna em `USER_FLOW_ANALYSIS.md`), mas isso é decisão de produto, não só visual — **alinhar com o time antes de implementar** (fora do escopo desta etapa).
**Dependências**: Fase 6.
**Prioridade**: Média.

## Fase 8 — Refatorar Dashboard
**Objetivo**: criar a rota `/dashboard` (hoje inexistente) como nova home pós-login, com KPIs consolidados + gráficos (faturamento ao longo do tempo, ranking de produtos) + atalhos para as operações do dia — atendendo diretamente ao pedido do guideline ("Dashboard inspirado em Stripe, HubSpot e Microsoft Fabric").
**Impacto**: maior mudança estrutural de UX do roadmap — mas puramente aditiva (nova rota), não quebra nenhum fluxo existente (`/pedidos` continua existindo como está).
**Dependências**: Fases 4-6, lib de gráficos instalada (`DEPENDENCY_REPORT.md`).
**Prioridade**: Alta.
**Observação de escopo**: criar uma nova rota é uma decisão de produto/arquitetura de informação, não só visual — alinhar com o time antes de codificar, mesmo que a implementação em si seja só front-end.

## Fase 9 — Refatorar formulários
**Objetivo**: migrar `LoginForm`, `CadastroForm`, `ProductForm`, `PedidoForm`, `PromocaoForm`, `FilialForm` para os novos primitivos (`Input`, `Select`, `Button` do DS), com erro por campo em vez de bloco de erro genérico.
**Impacto**: resolve `REFACTOR_OPPORTUNITIES.md` #12; `PedidoForm` é o mais complexo (candidato a quebra em subcomponentes durante a refatoração, sem alterar a lógica).
**Dependências**: Fase 5.
**Prioridade**: Alta.

## Fase 10 — Refatorar tabelas
**Objetivo**: migrar as 8 implementações de tabela (`DESIGN_DEBT.md` #6) para o `DataTable` genérico criado na Fase 3, incluindo `HistoricoPedidos`, tabelas de `/relatorios` e tabela de `/produtos`.
**Impacto**: maior ponto de consolidação de código duplicado do projeto.
**Dependências**: Fase 3 (`DataTable` já existente).
**Prioridade**: Alta.

## Fase 11 — Refatorar páginas
**Objetivo**: aplicar `PageHeader` em todas as ~13 páginas internas, revisar grids de KPI (padronizar 2/3/4 colunas — `DESIGN_DEBT.md` #10), unificar as 2 implementações de Tabs (`RelatoriosTabs`/`MovimentacoesToggle`) e as 2 de seletor de filial (`FilialSwitcher`/`FilialFilter`).
**Impacto**: elimina a maior parte da dívida de consistência mapeada em `DESIGN_DEBT.md`.
**Dependências**: Fases 3, 5, 10.
**Prioridade**: Alta.

## Fase 12 — Implementar Dark Mode
**Objetivo**: a arquitetura técnica atual (3 camadas, sem flash, paleta própria) já é sólida (`DESIGN_SYSTEM_ANALYSIS.md`, nota 7/10) — esta fase é sobre **portar os novos tokens da Fase 4 para os valores de dark mode do guideline** (Background `#0B1220`, Sidebar `#08111F`, Cards `#111827`, Hover `#172554`, Borders `#1F2937`), preservando a implementação existente.
**Impacto**: menor esforço relativo do roadmap, por já ter base técnica pronta.
**Dependências**: Fase 4.
**Prioridade**: Média.

## Fase 13 — Adicionar microinterações
**Objetivo**: transições de 150-250ms em abertura/fechamento de modal e toast, troca de aba, expansão de linha de tabela, hover de cards interativos — sem exagero, conforme princípio do guideline.
**Impacto**: polish final que aproxima a percepção do produto das referências citadas (Linear, Raycast).
**Dependências**: Fases 5, 10, 11 (componentes já existentes para animar).
**Prioridade**: Baixa.

## Fase 14 — Revisão visual completa
**Objetivo**: varredura final tela por tela (repetir o processo de `SCREENSHOTS.md` com o novo visual) checando consistência, contraste (WCAG AA), responsividade nos 4 breakpoints (desktop/notebook/tablet/celular) e ausência de regressão funcional.
**Impacto**: garantia de qualidade antes de considerar o redesign concluído.
**Dependências**: todas as fases anteriores.
**Prioridade**: Crítica (é o gate de conclusão do projeto).

---

## Visão consolidada

```
Fase 1  Analisar arquitetura              ✅ concluída
Fase 2  Identificar reuso                 ✅ concluída
Fase 3  Design System centralizado        🔴 crítica, próxima
Fase 4  Tokens globais                    🔴 crítica
Fase 5  Componentes base                  🔴 crítica
Fase 6  Sidebar                           🟠 alta
Fase 7  Topbar                            🟡 média (decisão de produto)
Fase 8  Dashboard                         🟠 alta (decisão de produto)
Fase 9  Formulários                       🟠 alta
Fase 10 Tabelas                           🟠 alta
Fase 11 Páginas                           🟠 alta
Fase 12 Dark Mode                         🟡 média
Fase 13 Microinterações                   🟢 baixa
Fase 14 Revisão final                     🔴 crítica (gate)
```

Conforme `CLAUDE.md` exige, cada fase a partir daqui deve ser aberta com plano explicado, arquivos afetados listados, e validação do usuário antes de mudanças grandes — este roadmap é a referência para essas conversas, não uma autorização de execução automática.

---

## Nota de atualização

Este documento foi escrito antes da Sprint do módulo Dashboard (mock visual, ver `04-Modules/Dashboard/` e `app/dashboard/`) ter sido implementada. A Fase 8 acima descreve a intenção original (Dashboard como nova home); a implementação real seguiu a spec mais detalhada que chegou depois em `docs/04-Modules/Dashboard/`. Vale revisar este roadmap à luz do que já foi construído antes de iniciar as próximas fases.
