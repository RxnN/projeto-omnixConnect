# REFACTOR_OPPORTUNITIES.md — Oportunidades de Melhoria Visual (Omnix Connect)

> Exclusivamente oportunidades de camada de apresentação — nenhuma envolve mudança de regra de negócio, rota, hook, contexto, autenticação, validação ou dado, em linha com `CLAUDE.md`. Organizado por prioridade.

## Prioridade Alta (maior impacto, base para tudo o resto)

1. **Criar tokens de Design System** (paleta, tipografia, spacing de 8px, radius) a partir da paleta e tipografia definidas em `DESIGN_GUIDELINES.md`. Sem isso, nenhuma outra melhoria tem uma base consistente pra seguir.
2. **Introduzir componente `Modal`/`ConfirmDialog`** e substituir todo `window.confirm()`/`window.alert()` (2 pontos de uso hoje: `ProductActiveToggle`, `HistoricoPedidos`).
3. **Introduzir sistema de `Toast`** e substituir mensagens de sucesso/erro em texto solto (presentes em praticamente todo formulário — `LoginForm`, `CadastroForm`, `FilialForm`, `PromocaoForm`, `ProductForm`, `PedidoForm`, `ImportExportProducts`, `NFeImport`, `HistoricoPedidos`).
4. **Adotar biblioteca de ícones** (Lucide recomendado) — hoje só a `NavBar` tem ícones (SVG manual); o resto do produto é só texto.
5. **Construir um Dashboard real** (a "home" hoje é `/pedidos`, uma tela operacional) com KPIs consolidados e ao menos 1-2 gráficos — item explícito do `DESIGN_GUIDELINES.md` ("Dashboard inspirado em Stripe, HubSpot e Microsoft Fabric").
6. **Adotar lib de gráficos** (Recharts ou Tremor) — pré-requisito técnico do item 5 e de qualquer visualização em `/relatorios`.

## Prioridade Média (consolidação e escala)

7. **Unificar as 2 implementações de "Abas"** (`RelatoriosTabs` vs. `MovimentacoesToggle`) num componente `Tabs` único.
8. **Unificar as 2 implementações de "seletor de filial"** (`FilialSwitcher` vs. `FilialFilter`) num componente visual único, com a persistência (cookie/URL) injetada por fora.
9. **Criar componente `PageHeader`** e substituir a duplicação manual de título+descrição em ~13 páginas.
10. **Criar componente `DataTable` genérico** e migrar as 8 implementações de tabela hoje espalhadas (`EstoqueAtualTable`, `FaturamentoSection`, `RentabilidadeSection`, `RecorrenciaTable`, `SugestaoCompraTable`, `HistoricoPedidos`, tabela de `/produtos`, tabela de `NFeImport`).
11. **Formalizar `Select`/`Dropdown` estilizado** (Radix recomendado) — hoje todo `<select>` é nativo do navegador, quebrando a identidade visual em: filial, forma de pagamento, categoria de produto, tipo de embalagem, período de relatório.
12. **Padronizar estados de erro por campo** nos formulários (borda vermelha + mensagem inline), em vez de um único bloco de erro genérico no fim do formulário.
13. **Adicionar skeleton loaders** em tabelas/KPIs durante fetch, substituindo o atual "Carregando..." em texto.

## Prioridade Baixa (polish)

14. **Componentizar `Button` com variantes/tamanhos/loading** formalmente (`variant`, `size`, `loading` como props), substituindo as classes CSS fixas atuais.
15. **Adicionar elevação (sombra leve)** a cards e elementos interativos, hoje inexistente em 100% do produto.
16. **Revisar espaçamento vertical** entre seções pra uma escala de 8px estrita e documentada.
17. **Adicionar microinterações discretas** (150-250ms) em transições de abas, abertura de modal/toast, expansão de linha de tabela.
18. **Padronizar grids de KPI** (hoje variam entre 2/3/4 colunas sem critério documentado).
19. **Trocar fonte de Manrope para Inter/Plus Jakarta Sans**, conforme guideline.
20. **Adicionar ícones a estados vazios** ("Nenhum produto cadastrado ainda" etc.), hoje só texto.

## Fora de escopo (mencionado apenas para registro — não fazer nesta fase)

- Correção do bug de datas de promoção (`31/12/1969`/"Expirada" com datas vazias) — é lógica de validação, não visual. Já reportado separadamente à parte, fora deste conjunto de documentos.
- Qualquer mudança em `lib/`, `app/api/`, `prisma/` — fora do escopo declarado em `CLAUDE.md`.

---

## Tabela-resumo

| # | Item | Prioridade | Esforço estimado* |
|---|---|---|---|
| 1 | Tokens de Design System | Alta | M |
| 2 | Modal/ConfirmDialog | Alta | S |
| 3 | Toast | Alta | S |
| 4 | Lib de ícones | Alta | S |
| 5 | Dashboard com gráficos | Alta | L |
| 6 | Lib de gráficos | Alta | S |
| 7 | Unificar Tabs | Média | S |
| 8 | Unificar seletor de filial | Média | S |
| 9 | `PageHeader` | Média | S |
| 10 | `DataTable` genérico | Média | M |
| 11 | `Select`/Dropdown custom | Média | M |
| 12 | Erro por campo | Média | S |
| 13 | Skeleton loaders | Média | S |
| 14 | `Button` com variantes | Baixa | S |
| 15 | Elevação/sombra | Baixa | S |
| 16 | Espaçamento 8px | Baixa | S |
| 17 | Microinterações | Baixa | S |
| 18 | Grids de KPI padronizados | Baixa | S |
| 19 | Troca de fonte | Baixa | S |
| 20 | Ícones em estados vazios | Baixa | S |

*S = pequeno (< 1 dia), M = médio (1-3 dias), L = grande (> 3 dias) — estimativas qualitativas de esforço de implementação, não de prazo de projeto.
