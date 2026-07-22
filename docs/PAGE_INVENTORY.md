# PAGE_INVENTORY.md — Inventário de Páginas (Omnix Connect)

> 14 rotas no total (App Router). Complexidade: **Baixa** (só exibição/redirect), **Média** (1 formulário ou 1 listagem), **Alta** (múltiplos componentes de estado + lógica de carrinho/cálculo).

## Públicas (sem sessão)

### Login
- **Rota**: `/`
- **Arquivo**: `app/page.tsx`
- **Objetivo**: Autenticar usuário existente; redireciona pra `/pedidos` se já logado.
- **Componentes**: `LoginForm`
- **Dependências**: `lib/session.ts` (`getCurrentUser`)
- **Complexidade**: Baixa

### Cadastro
- **Rota**: `/cadastro`
- **Arquivo**: `app/cadastro/page.tsx`
- **Objetivo**: Auto-cadastro self-service de uma nova conta (empresa + dono).
- **Componentes**: `CadastroForm`
- **Dependências**: `lib/session.ts`
- **Complexidade**: Baixa (a complexidade real está no formulário filho)

## Estados de bloqueio

### Aguardando aprovação / Assinatura vencida
- **Rota**: `/aguardando-aprovacao`
- **Arquivo**: `app/aguardando-aprovacao/page.tsx`
- **Objetivo**: Tela de espera pra conta ainda não aprovada manualmente, ou pausada por assinatura vencida — mesma rota, mensagem condicional.
- **Componentes**: nenhum (JSX direto)
- **Dependências**: `lib/auth.ts` (`isSubscriptionExpired`), `lib/repo` (`getAdegaById`)
- **Complexidade**: Baixa

### Acesso negado
- **Rota**: `/acesso-negado`
- **Arquivo**: `app/acesso-negado/page.tsx`
- **Objetivo**: Tela de erro 403 amigável quando o papel do usuário não permite a rota.
- **Componentes**: nenhum
- **Dependências**: nenhuma
- **Complexidade**: Baixa

## Operação diária (Caixa / Estoque)

### Pedidos (Caixa/Venda)
- **Rota**: `/pedidos`
- **Arquivo**: `app/pedidos/page.tsx`
- **Objetivo**: Tela principal de operação — montar e fechar vendas (pedidos de saída), ver histórico recente.
- **Componentes**: `PedidoForm` (type="OUT"), `HistoricoPedidos`
- **Dependências**: `lib/auth.ts`, `lib/repo` (`listProducts`, `listPedidos`, `listPromotionsByFilial`), `lib/filial-context.ts`
- **Complexidade**: Alta (é a tela mais usada e mais rica em interação: carrinho, cálculo de promoção em tempo real, forma de pagamento, tratamento de estoque insuficiente)

### Entrada
- **Rota**: `/entrada`
- **Arquivo**: `app/entrada/page.tsx`
- **Objetivo**: Registrar chegada de mercadoria (pedidos de entrada), com opção de importar via XML de NF-e.
- **Componentes**: `PedidoForm` (type="IN", com `NFeImport` embutido), `HistoricoPedidos`
- **Dependências**: mesmas de Pedidos
- **Complexidade**: Alta (soma a complexidade do carrinho com o fluxo de import de XML)

### Movimentações
- **Rota**: `/movimentacao`
- **Arquivo**: `app/movimentacao/page.tsx`
- **Objetivo**: Consulta somente-leitura do histórico completo, alternando entre Saída e Entrada.
- **Componentes**: `MovimentacoesToggle` → `HistoricoPedidos`
- **Dependências**: `lib/repo` (`listPedidos`)
- **Complexidade**: Baixa (é uma composição de componentes já existentes)

## Produtos

### Lista de Produtos
- **Rota**: `/produtos`
- **Arquivo**: `app/produtos/page.tsx`
- **Objetivo**: Catálogo da filial ativa — tabela com KPIs (valor total em estoque, produtos abaixo do mínimo), import/export de planilha.
- **Componentes**: `ImportExportProducts`
- **Dependências**: `lib/repo` (`listProducts`, `getAdegaById`, `listPromotionsByFilial`), `lib/pricing.ts`
- **Complexidade**: Média

### Novo Produto
- **Rota**: `/produtos/novo`
- **Arquivo**: `app/produtos/novo/page.tsx`
- **Objetivo**: Cadastro de produto novo (só dono).
- **Componentes**: `ProductForm`
- **Dependências**: `lib/auth.ts` (`requireRole`)
- **Complexidade**: Baixa (delega tudo ao `ProductForm`)

### Detalhe de Produto
- **Rota**: `/produtos/[id]`
- **Arquivo**: `app/produtos/[id]/page.tsx`
- **Objetivo**: Ficha do produto (estoque, preços, embalagem, promoções ativas/agendadas vinculadas).
- **Componentes**: `ProductActiveToggle`
- **Dependências**: `lib/repo` (`getProductById`, `listPromotionsByProductIds`), `lib/pricing.ts`
- **Complexidade**: Média

### Editar Produto
- **Rota**: `/produtos/[id]/editar`
- **Arquivo**: `app/produtos/[id]/editar/page.tsx`
- **Objetivo**: Edição de produto existente (só dono).
- **Componentes**: `ProductForm`
- **Dependências**: `lib/repo` (`getProductById`)
- **Complexidade**: Baixa

## Promoções

### Promoções
- **Rota**: `/promocoes`
- **Arquivo**: `app/promocoes/page.tsx`
- **Objetivo**: Gestão de promoções por período e/ou quantidade mínima, escopadas à filial ativa (só dono).
- **Componentes**: `PromocoesList`, `PromocaoForm`
- **Dependências**: `lib/repo` (`listProducts`, `listPromotionsByFilial`)
- **Complexidade**: Média

## Filiais

### Filiais
- **Rota**: `/filiais`
- **Arquivo**: `app/filiais/page.tsx`
- **Objetivo**: Gestão multi-loja — listar filiais e criar novas dentro do limite licenciado (só dono).
- **Componentes**: `FilialForm`
- **Dependências**: `lib/repo` (`listFiliais`, `getAdegaById`)
- **Complexidade**: Baixa

## Relatórios

### Relatórios
- **Rota**: `/relatorios`
- **Arquivo**: `app/relatorios/page.tsx`
- **Objetivo**: Central analítica — estoque, rentabilidade, faturamento, sugestão de compra, ranking de recorrência. Visão varia por papel (dono vê tudo + filtro de filial e período; gerente só estoque + faturamento do mês).
- **Componentes**: `RelatoriosTabs` (e toda a árvore de `components/relatorios/`)
- **Dependências**: `lib/reports.ts` (6 funções de agregação), `lib/repo` (`listFiliais`)
- **Complexidade**: Alta (é a página com mais lógica condicional de exibição por papel + mais componentes filhos)

## Layout raiz (não é uma "página" navegável)

### Root Layout
- **Arquivo**: `app/layout.tsx`
- **Objetivo**: Busca usuário/adega/filiais/assinatura no servidor, degrada graciosamente em caso de erro, delega renderização do shell para `AppShell`.
- **Componentes**: `AppShell`
- **Dependências**: `lib/session.ts`, `lib/repo`, `lib/auth.ts`, `lib/filial-context.ts`
- **Complexidade**: Média (não é UI em si, mas orquestra dados que toda página depende)

## Notas sobre a arquitetura de rotas

- Todas as rotas são "flat" sob `app/` — não há `route groups` `(auth)`/`(app)` para separar visualmente páginas públicas de autenticadas no código, embora o comportamento final (via `AppShell`) simule essa separação.
- Não existe uma rota `/dashboard` — a "home" pós-login é `/pedidos`. O `DESIGN_GUIDELINES.md` menciona um Dashboard "inspirado em Stripe, HubSpot e Microsoft Fabric" com "KPIs, gráficos, rankings, insights, alertas" — **isso não existe hoje** (achado importante para o `ROADMAP.md`).
- Não existe rota de **Configurações/Settings** (perfil do usuário, dados da empresa, preferências) nem de **Clientes/CRM** — apesar de ambos aparecerem como exemplo de fluxo no pedido de auditoria, eles simplesmente não existem no produto atual.
