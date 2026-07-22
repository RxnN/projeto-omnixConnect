# USER_FLOW_ANALYSIS.md — Mapeamento de Fluxos (Omnix Connect)

> Cliques contados a partir da tela anterior relevante, no caminho mais curto (sem erros de digitação). "Dashboard", "Clientes" e "Configurações" são mapeados como **inexistentes** — ver observação em cada um.

## Login

- **Objetivo**: autenticar e chegar em `/pedidos`.
- **Nº de cliques**: 2 (foco no campo e-mail → preencher → foco senha → preencher → clique "Entrar") — na prática, 1 clique de fato (o botão), já que os campos são preenchidos por digitação.
- **Pontos de atrito**: nenhum estrutural. O texto fixo de "credenciais de demonstração" na tela pode confundir um usuário real caso fique desatualizado (achado observado durante a auditoria).
- **Pontos confusos**: nenhum.
- **Melhorias recomendadas**: considerar remover/ocultar o bloco de credenciais de demo em produção, ou tornar claro que são exemplos e não credenciais válidas universalmente.
- **Complexidade**: Baixa.

## Cadastro (self-service)

- **Objetivo**: criar uma nova conta (empresa + dono) e cair em estado "aguardando aprovação".
- **Nº de cliques**: 1 (botão "Cadastrar e Entrar") após preencher 6 campos (nome da empresa, CNPJ/CPF, nome, contato, e-mail, senha).
- **Pontos de atrito**: 6 campos obrigatórios antes do primeiro valor de produto ser sequer mencionado — razoável para uma conta B2B, mas é o formulário mais longo do fluxo de entrada.
- **Pontos confusos**: o usuário só descobre que a conta fica bloqueada até aprovação manual **depois** de se cadastrar (na tela seguinte) — não há aviso disso no próprio formulário.
- **Melhorias recomendadas**: adicionar uma nota no formulário avisando sobre a aprovação manual, para gerenciar expectativa antes do envio.
- **Complexidade**: Baixa.

## "Dashboard"

- **Situação real**: **não existe uma rota `/dashboard`**. A tela que mais se aproxima do conceito é `/relatorios`, mas ela é acessada por um clique de menu separado e não é a tela inicial pós-login (que é `/pedidos`, uma tela operacional de venda).
- **Objetivo (do conceito, hoje não atendido)**: visão executiva rápida do negócio ao abrir o sistema.
- **Nº de cliques até algo parecido**: 1 (clicar em "Relatórios" no menu) a partir de qualquer tela.
- **Pontos de atrito**: o "dashboard" real (`/relatorios`) é 100% tabela — não há leitura rápida de tendência (precisa ler número por número).
- **Pontos confusos**: um usuário vindo de outro SaaS (Stripe, HubSpot) esperaria uma visão consolidada logo no login; hoje ele cai direto na operação (Caixa).
- **Melhorias recomendadas**: este é o item mais estratégico do roadmap — criar `/dashboard` como nova home, com KPIs + gráficos + atalhos pras operações do dia.
- **Complexidade**: Alta (é a maior lacuna estrutural do produto).

## Pedidos (Caixa / Venda)

- **Objetivo**: fechar uma venda com um ou mais produtos.
- **Nº de cliques**: mínimo 4 — (1) buscar e clicar no produto no autocomplete, (2) ajustar quantidade (opcional se for 1), (3) selecionar forma de pagamento, (4) clicar "Fechar pedido de saída". Cada produto adicional soma +1 clique.
- **Pontos de atrito**: forma de pagamento é obrigatória e fica só depois do carrinho — se o operador esquece, só descobre o erro ao tentar fechar (mensagem de erro genérica, não posicionada no campo).
- **Pontos confusos**: o preço promocional só aparece **depois** de o produto já estar no carrinho — o vendedor não sabe de antemão, ao buscar, que aquele item está em promoção.
- **Melhorias recomendadas**: indicar promoção já na lista de resultados do autocomplete; posicionar erro de "forma de pagamento" diretamente no campo/select.
- **Complexidade**: Alta (é a tela com mais estado interativo do produto: carrinho, conversão de unidade, preço dinâmico, forma de pagamento condicional).

## Entrada (recebimento de mercadoria)

- **Objetivo**: registrar chegada de estoque, manualmente ou via importação de NF-e (XML).
- **Nº de cliques (manual)**: igual ao fluxo de Pedidos (mínimo 4).
- **Nº de cliques (via NF-e)**: 2 (escolher arquivo XML → "Adicionar N itens ao pedido de entrada") + cliques extras só se algum item não casar automaticamente por código de barras (precisa buscar e vincular manualmente).
- **Pontos de atrito**: quando um item da NF-e não é reconhecido, o vendedor precisa reconhecer o alerta amarelo e agir por item — pode ser fácil de ignorar em notas com muitos itens.
- **Pontos confusos**: nenhum estrutural — o fluxo de revisão (tabela com produto casado/não casado) é bem sinalizado com cor de aviso.
- **Melhorias recomendadas**: destacar visualmente (não só cor de fundo) quantos itens ainda precisam de ação antes de habilitar o botão de confirmar, algo que já existe via contagem no texto do botão ("Adicionar N itens..."), mas poderia ser mais proeminente.
- **Complexidade**: Alta (soma o carrinho da tela de Pedidos com o parser/revisor de NF-e).

## Movimentações (histórico consolidado)

- **Objetivo**: consultar histórico de saída/entrada, sem poder editar.
- **Nº de cliques**: 1 (alternar Saída/Entrada) + 1 por pedido que se queira expandir.
- **Pontos de atrito**: nenhum (é uma tela puramente de consulta).
- **Pontos confusos**: nenhum.
- **Melhorias recomendadas**: nenhuma prioritária — considerar paginação quando o histórico crescer muito (hoje limitado a 50 itens por tipo, sem forma de ver além disso pela UI).
- **Complexidade**: Baixa.

## Produtos (catálogo)

- **Objetivo**: consultar/gerenciar catálogo da filial.
- **Nº de cliques até criar um produto**: 2 (clicar "+ Novo produto" → preencher formulário → "Cadastrar produto").
- **Nº de cliques até editar**: 3 (clicar "Ver" na linha → clicar "Editar" → salvar).
- **Pontos de atrito**: para editar, é preciso passar pela tela de detalhe primeiro — não há atalho direto "Editar" na própria listagem.
- **Pontos confusos**: nenhum.
- **Melhorias recomendadas**: considerar um atalho de edição direto na linha da tabela (ícone de lápis), reduzindo de 3 pra 2 cliques.
- **Complexidade**: Média.

## "Clientes" (CRM)

- **Situação real**: **não existe.** Não há cadastro de cliente, histórico de compras por cliente, nem CRM de nenhum tipo no produto hoje — pedidos registram só a forma de pagamento (incluindo "Fiado", que sugere a necessidade de rastrear quem deve, mas não há uma tela pra isso).
- **Observação**: como o fluxo "Fiado" já existe sem controle de "pra quem", esta é uma lacuna de produto relevante, não só de UI. Fica registrada aqui apenas como achado de mapeamento (fora do escopo desta auditoria implementar).

## Promoções

- **Objetivo**: criar uma promoção por período e/ou quantidade mínima.
- **Nº de cliques**: 3 — (1) buscar e selecionar produto no autocomplete, (2) preencher preço promocional (+ campos opcionais), (3) "+ Nova promoção".
- **Pontos de atrito**: nenhum incapacitante — mas ver bug reportado separadamente (datas vazias geram promoção já "Expirada"), que é sintoma de UX confuso mesmo sendo causa técnica (o formulário não impede nem avisa sobre esse estado).
- **Pontos confusos**: o texto de ajuda explica bem quando cada campo se aplica ("Deixe em branco pra valer desde a 1ª unidade").
- **Melhorias recomendadas**: nenhuma de UI pura — o achado relevante é funcional (já reportado à parte).
- **Complexidade**: Média.

## Relatórios

- **Objetivo**: consultar estoque, rentabilidade, faturamento, sugestão de compra, recorrência.
- **Nº de cliques**: 1 (trocar de aba) + opcionalmente 1 (filtrar filial) + 1 (filtrar período).
- **Pontos de atrito**: sem gráfico, comparar tendência ao longo do tempo exige ler múltiplas linhas de tabela mentalmente.
- **Pontos confusos**: o conjunto de abas disponíveis muda por papel (gerente só vê 2 de 5 abas) — comportamento correto, mas pode gerar confusão pontual pra quem alterna entre contas de papéis diferentes sem lembrar da diferença.
- **Melhorias recomendadas**: gráficos (ver `REFACTOR_OPPORTUNITIES.md` #5/#6); considerar uma nota textual explicando por que certas abas não aparecem pro papel atual.
- **Complexidade**: Alta (mais lógica condicional de exibição por papel do produto).

## "Configurações"

- **Situação real**: **não existe.** Não há tela de perfil de usuário, preferências, dados da empresa (edição pós-cadastro), nem gestão de outros usuários (convidar gerente/funcionário) — mencionado também no código-fonte como lacuna conhecida ("Hoje não existe nenhuma tela/rota pra o dono convidar/criar um MANAGER ou EMPLOYEE").
- **Observação**: como o roadmap do redesign inclui "Topbar" e potencialmente um menu de usuário, este é o lugar natural para essa lacuna ser preenchida — mas fica fora do escopo desta etapa (visual apenas, sem nova funcionalidade).

## Filiais

- **Objetivo**: consultar/criar filiais dentro do limite licenciado.
- **Nº de cliques**: 1 (preencher nome → "+ Nova filial") quando dentro do limite.
- **Pontos de atrito**: quando no limite, o formulário desaparece e vira uma mensagem — comportamento correto, mas pode ser mais claro com um CTA de contato direto (hoje é só texto "Fale com a gente").
- **Pontos confusos**: nenhum.
- **Melhorias recomendadas**: transformar "Fale com a gente" em um link/botão de ação real (ex: mailto ou WhatsApp), hoje é texto solto sem interação.
- **Complexidade**: Baixa.

---

## Resumo de complexidade por fluxo

| Fluxo | Complexidade | Existe hoje? |
|---|---|---|
| Login | Baixa | Sim |
| Cadastro | Baixa | Sim |
| Dashboard | Alta | **Não** |
| Pedidos (Caixa) | Alta | Sim |
| Entrada | Alta | Sim |
| Movimentações | Baixa | Sim |
| Produtos | Média | Sim |
| Clientes/CRM | — | **Não** |
| Promoções | Média | Sim |
| Relatórios | Alta | Sim |
| Configurações | — | **Não** |
| Filiais | Baixa | Sim |
