# UI_METRICS.md — Métricas de Qualidade de Interface (Omnix Connect)

> Escala de 0 a 10. Complementa `DESIGN_SYSTEM_ANALYSIS.md` (que avalia componentes específicos) com uma visão de qualidades transversais da interface como um todo.

## Consistência — 5/10

**Justificativa**: primitivos (`.btn`, `.card`, `.input`, `.pill`) são aplicados de forma disciplinada, mas há duplicação funcional (2 implementações de abas, 2 de seletor de filial) e inconsistência semântica de cor (`--accent` == `--warn`). A consistência é forte "dentro de cada tela" e mais fraca "entre telas parecidas".

**Sugestão**: consolidar componentes duplicados (ver `DESIGN_DEBT.md`) antes de escalar o Design System — reduzir de 2 padrões pra 1 em cada caso.

## Legibilidade — 6/10

**Justificativa**: contraste texto/fundo é alto na maior parte da interface (`--ink` sobre `--surface`/`--bg`), números usam fonte monoespaçada tabular (ótima prática para tabelas financeiras). Ponto fraco: uso extensivo de `--ink-soft` (cinza) para informação que às vezes é importante (ex: categoria do produto, forma de pagamento no histórico), sem confirmação de que atinge 4.5:1 de contraste em ambos os temas.

**Sugestão**: validar contraste de `--ink-soft` formalmente (ferramenta tipo axe/Lighthouse) ao definir a paleta nova.

## Espaçamento — 5/10

**Justificativa**: usa a escala do Tailwind (múltiplos de 4px), mas sem uma escala de 8px documentada e aplicada com disciplina — valores como `py-2`, `py-2.5`, `py-3` aparecem de forma intercambiável em componentes visualmente equivalentes.

**Sugestão**: documentar e migrar pra uma escala de 8px estrita (`8/16/24/32/48/64`) conforme pedido no guideline.

## Hierarquia — 5/10

**Justificativa**: hierarquia tipográfica é rasa (título de página + corpo, pouca gradação entre eles); hierarquia de cor é quase inexistente (nenhuma elevação/sombra separa "card principal" de "card secundário" na mesma tela). O usuário depende mais da ordem de leitura (topo→baixo) do que de pistas visuais de importância.

**Sugestão**: introduzir 2-3 níveis de elevação e uma escala tipográfica mais rica na Fase de tokens.

## Escalabilidade — 4/10

**Justificativa**: sem Design System, cada nova tela tende a reimplementar padrões (ver: 25 componentes, maioria de uso único; ausência de `DataTable`, `Modal`, `Toast`, `PageHeader` genéricos). O produto já sente esse custo — comparar `RelatoriosTabs` e `MovimentacoesToggle`, dois "Tabs" implementados de formas diferentes por terem sido escritos em momentos diferentes.

**Sugestão**: é o argumento central para a Fase 2/3 do `ROADMAP.md` — Design System centralizado antes de continuar adicionando telas.

## Responsividade — 6/10

**Justificativa**: cobertura mobile real e funcional (drawer, grids colapsáveis) é um diferencial positivo neste estágio. Fraqueza em tabelas densas (dependem de scroll horizontal) e ausência de tratamento dedicado para tablet.

**Sugestão**: ver `DESIGN_SYSTEM_ANALYSIS.md` → Responsividade.

## Acessibilidade — 3/10

**Justificativa**: fundamentos existem (foco visível, alguns `aria-label`, navegação por teclado no autocomplete), mas `confirm()`/`alert()` nativos, falta de `aria-live` em mensagens de feedback, e nenhuma validação formal de contraste colocam a interface abaixo do WCAG AA declarado como meta.

**Sugestão**: prioridade alta no roadmap — não é só "polish", é um requisito explícito do guideline (`WCAG AA`).

## Performance Visual — 6/10

**Justificativa**: sem imagens pesadas (não há `public/` com assets), sem animações custosas, fontes carregadas via `next/font` (otimizado, sem FOUT). O app já é leve por natureza (poucas dependências de UI). Ponto fraco: nenhum skeleton/loading state visual — durante fetch, a única pista é texto "Carregando..."/desabilitar botão, o que pode parecer travado em conexões lentas.

**Sugestão**: adicionar skeleton loaders nas tabelas/KPIs, especialmente relevante quando gráficos forem introduzidos (que têm custo de renderização maior).

## Dark Mode — 7/10

**Justificativa**: a métrica mais alta do relatório. Arquitetura tecnicamente correta (sem flash, paleta própria, 3 camadas de resolução de tema) — só precisa de nova paleta de valores, não de nova arquitetura.

**Sugestão**: preservar a implementação técnica; substituir só os tokens de cor.

## Design System — 2/10

**Justificativa**: não existe formalmente. O que existe é um conjunto pequeno e não documentado de classes utilitárias. Categorias inteiras esperadas de um DS (Modal, Toast, Charts, ícones de biblioteca, tokens documentados, variantes de componente) estão ausentes.

**Sugestão**: é o objeto central de todo o `ROADMAP.md` — praticamente todas as outras métricas deste documento sobem como consequência de resolver esta.

---

## Resumo

| Métrica | Nota |
|---|---|
| Consistência | 5/10 |
| Legibilidade | 6/10 |
| Espaçamento | 5/10 |
| Hierarquia | 5/10 |
| Escalabilidade | 4/10 |
| Responsividade | 6/10 |
| Acessibilidade | 3/10 |
| Performance Visual | 6/10 |
| Dark Mode | 7/10 |
| Design System | 2/10 |
| **Média geral** | **4.9/10** |

O padrão que se repete em quase toda métrica: **o que existe é limpo, mas incompleto**. Não há necessidade de "consertar" nada estruturalmente — há necessidade de **construir as camadas que faltam** sobre uma base que já é razoavelmente saudável.
