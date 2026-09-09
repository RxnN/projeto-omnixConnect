# Omnix Connect — Gestão de Estoque e Vendas (Protótipo)

Protótipo funcional de um sistema **SaaS multi-tenant** para gestão de estoque e vendas de
empresas (como lojas de vinhos e destilados). Cada empresa possui seus próprios usuários, produtos e
movimentações, totalmente isolados dos dados de outras empresas.

## Stack técnica

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** para estilização
- **Banco de dados**: PostgreSQL/Neon acessado pelo Prisma
- **Autenticação**: sessão criptografada com `iron-session` e senhas com hash `bcryptjs`
- **Proteção multi-tenant**: filtros na aplicação e políticas PostgreSQL RLS com contexto assinado
- **Confirmação de e-mail**: links de uso único enviados pela API da Resend

## Instalação e execução

Pré-requisito: **Node.js 22.5 ou superior**.

Copie `.env.example` para `.env` e configure as variáveis. Use duas conexões diferentes:

- `DATABASE_URL`: usuário restrito usado pelo site em execução.
- `DATABASE_ADMIN_URL`: proprietário do schema, mantido apenas no computador administrativo para migrações, seed e scripts. Nunca configure essa variável na Vercel.

```bash
npm install
npm run db:migrate:admin
npm run db:seed
npm run dev
```

Também configure `SESSION_SECRET`, `RLS_CONTEXT_SECRET`, as chaves reais do Turnstile,
`APP_ORIGIN`, `RESEND_API_KEY` e `EMAIL_FROM`. Segredos reais permanecem somente no `.env`
ignorado e nas variáveis protegidas da hospedagem.

Para ativar RLS com segurança, publique primeiro o código compatível e as variáveis. Em seguida,
no computador que possui `DATABASE_ADMIN_URL`, execute:

```bash
npm run db:rls:activate
```

Se for necessário reverter imediatamente a ativação, use `npm run db:rls:disable`.
## Usuários de demonstração

Todos os usuários abaixo pertencem à empresa **"Empresa Exemplo"**. A senha é definida localmente pela variável ignorada `DEMO_PASSWORD` e não fica registrada no repositório.

| E-mail                  | Papel        | O que enxerga |
|--------------------------|--------------|---------------|
| `dono@empresaexemplo.com`         | Dono (OWNER) | Acesso total: movimentação, produtos (CRUD completo) e todos os relatórios (todos os períodos, sugestão de compra, ranking de recorrência). |
| `gerente@empresaexemplo.com`      | Gerente (MANAGER) | Movimentação de estoque e relatório **limitado**: apenas estoque atual e faturamento/saídas do mês corrente. Produtos em modo somente leitura. |
| `funcionario@empresaexemplo.com`  | Funcionário (EMPLOYEE) | Apenas a tela de Movimentação de Estoque (entradas e saídas) e listagem de produtos somente leitura, para apoiar o registro de movimentações. Sem acesso a relatórios ou cadastro de produtos. |

## Telas e funcionalidades

1. **Login** (`/`) — e-mail e senha; redireciona conforme o papel do usuário após autenticar.
2. **Movimentação de Estoque** (`/movimentacao`) — disponível para todos os papéis. Permite
   registrar entradas (compras/reposição) e saídas (vendas), com quantidade e valor unitário
   (pré-preenchido com custo/venda do produto, editável). Para saídas, há um botão
   **"Escanear QR Code"** que abre a câmera (via `html5-qrcode`) para identificar o produto
   automaticamente; a seleção manual em um `<select>` continua disponível como alternativa
   sempre visível. O sistema avisa quando uma saída deixaria o estoque negativo e pede
   confirmação explícita antes de permitir (não bloqueia — é um protótipo realista).
3. **Produtos** (`/produtos`) — listagem para todos os papéis (somente leitura para
   Gerente/Funcionário). Dono pode criar, editar e excluir produtos. Cada produto tem uma
   página de detalhe (`/produtos/[id]`) que gera e exibe seu **QR Code** (codificando o ID do
   produto), com botão para baixar/imprimir a imagem.
4. **Relatórios** (`/relatorios`) — acesso apenas para Dono e Gerente (bloqueado
   server-side para Funcionário, não apenas escondido na navegação):
   - **Estoque atual**: quantidade e valor (a custo) de cada produto.
   - **Faturamento e volume vendido**: filtráveis por dia, semana, mês ou período
     customizado (seletor de datas) — filtros completos apenas para o Dono; Gerente vê
     fixo o mês corrente.
   - **Sugestão de compra** (somente Dono): consumo médio diário calculado sobre as saídas
     dos últimos 30 dias, comparado ao estoque atual, estimando dias de estoque restante e
     sugerindo quantidade de reposição para cobrir os próximos 30 dias de demanda média.
   - **Produtos com maior recorrência de saída** (somente Dono): ranking por número de
     movimentações de saída no período (frequência de venda), não apenas por volume.

## Controle de acesso por papel (RBAC)

O controle de acesso é aplicado **tanto na navegação (UI) quanto no backend** (páginas
Server Component e rotas de API), nunca apenas escondendo botões:

- `lib/auth.ts` expõe `requireUser()` e `requireRole()`, usados em toda página que precisa de
  autenticação/permissão — redirecionam para `/` (não logado) ou `/acesso-negado` (sem
  permissão).
- Todas as rotas de API (`/api/produtos`, `/api/produtos/[id]`, `/api/movimentos`, etc.)
  verificam a sessão e o papel do usuário antes de executar qualquer operação, e todas as
  consultas ao banco são filtradas por `empresaId` do usuário logado — garantindo isolamento
  entre empresas (multi-tenant) mesmo que alguém tente manipular um ID de produto de outra
  empresa diretamente pela API.

## Limitações conhecidas

- **Leitura de QR Code por câmera** depende de permissão do navegador e de contexto seguro
  (HTTPS ou `localhost`). Em ambientes sandbox/containers sem câmera real ou sem permissão de
  mídia, a inicialização da câmera falha graciosamente com uma mensagem explicativa — a
  seleção manual do produto no formulário **sempre** funciona como alternativa.
- O cliente Prisma não é utilizado em tempo de execução neste protótipo (ver nota técnica
  acima); a camada de dados usa `node:sqlite` seguindo fielmente o mesmo schema.
- Gestão de usuários (criar gerentes/funcionários pela UI) não foi implementada nesta versão
  — é um "nice-to-have" citado no escopo original e pode ser adicionada futuramente
  (o modelo de dados já suporta múltiplos usuários por empresa).
- Sem paginação nas listagens (adequado ao volume de dados de um protótipo/demo).
- `node:sqlite` é uma API ainda experimental no Node.js (emite um aviso no console); estável o
  suficiente para este protótipo, mas vale acompanhar a evolução da API em produção.
