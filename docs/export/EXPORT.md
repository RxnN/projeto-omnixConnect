# EXPORT — Diagramas de Arquitetura Front-end (Omnix Connect)

> Complementa os 13 documentos em `/docs`. Diagramas em Mermaid — renderizam nativamente em GitHub, GitLab, Notion, VS Code (com extensão) e na maioria dos visualizadores de Markdown modernos.

## 1. Mapa de rotas

Inclui redirecionamentos condicionais (não é só a lista de arquivos — mostra o comportamento real de navegação).

```mermaid
flowchart TD
    Start([Usuário acessa o app]) --> HasSession{Sessão válida?}

    HasSession -- Não --> Login["/  (Login)"]
    HasSession -- Sim --> CheckApproval{Adega aprovada<br/>e assinatura em dia?}

    Login -- credenciais corretas --> CheckApproval
    Login -- "Cadastre sua Adega" --> Cadastro["/cadastro"]
    Cadastro -- cadastro enviado --> Aguardando["/aguardando-aprovacao"]

    CheckApproval -- Não --> Aguardando
    CheckApproval -- Sim --> RoleCheck{Papel do usuário}

    RoleCheck -- "OWNER / MANAGER / EMPLOYEE" --> Pedidos["/pedidos (home pós-login)"]

    Pedidos --> Entrada["/entrada"]
    Pedidos --> Movimentacao["/movimentacao"]
    Pedidos --> Produtos["/produtos"]
    Produtos --> ProdutoNovo["/produtos/novo (OWNER)"]
    Produtos --> ProdutoDetalhe["/produtos/[id]"]
    ProdutoDetalhe --> ProdutoEditar["/produtos/[id]/editar (OWNER)"]

    Pedidos -.OWNER/MANAGER.-> Relatorios["/relatorios"]
    Pedidos -.OWNER only.-> Promocoes["/promocoes"]
    Pedidos -.OWNER only.-> Filiais["/filiais"]

    RoleCheck -- "rota fora do papel" --> AcessoNegado["/acesso-negado"]

    style Login fill:#1E66F5,color:#fff
    style Cadastro fill:#1E66F5,color:#fff
    style Aguardando fill:#F59E0B,color:#111
    style AcessoNegado fill:#EF4444,color:#fff
    style Pedidos fill:#22C55E,color:#111
```

## 2. Árvore de navegação (Sidebar) por papel

```mermaid
flowchart LR
    subgraph OWNER["Dono (OWNER)"]
        O1[Pedidos] --> O2[Entrada] --> O3[Movimentações] --> O4[Relatórios] --> O5[Produtos] --> O6[Promoções] --> O7[Filiais]
    end

    subgraph MANAGER["Gerente (MANAGER)"]
        M1[Pedidos] --> M2[Entrada] --> M3[Movimentações] --> M4[Relatórios] --> M5[Produtos]
    end

    subgraph EMPLOYEE["Funcionário (EMPLOYEE)"]
        E1[Pedidos] --> E2[Entrada] --> E3[Movimentações] --> E4[Produtos]
    end
```

**Leitura**: cada papel vê um subconjunto estritamente decrescente de links — Funcionário não vê Relatórios/Promoções/Filiais; Gerente não vê Promoções/Filiais. Nenhum papel vê "Dashboard" ou "Configurações" porque essas rotas não existem hoje (ver `USER_FLOW_ANALYSIS.md`).

## 3. Relação Layout → Página → Componentes

```mermaid
flowchart TD
    RootLayout["app/layout.tsx<br/>(busca user/adega/filiais/assinatura)"] --> AppShell["AppShell.tsx<br/>(decide mostrar ou não o menu)"]

    AppShell -->|rota pública: / ou /cadastro| Bare["&lt;main&gt;{children}&lt;/main&gt; sem menu"]
    AppShell -->|rota autenticada| Shell["NavBar + SubscriptionBanner + &lt;main&gt;"]

    Shell --> NavBar["NavBar.tsx"]
    NavBar --> ThemeToggle
    NavBar --> FilialSwitcher

    Shell --> PageContent["{children} = página atual"]

    PageContent --> PgPedidos["/pedidos"] --> PedidoForm & HistoricoPedidos
    PageContent --> PgEntrada["/entrada"] --> PedidoForm2["PedidoForm"] --> NFeImport
    PageContent --> PgProdutos["/produtos"] --> ImportExportProducts
    PageContent --> PgPromocoes["/promocoes"] --> PromocaoForm & PromocoesList
    PageContent --> PgRelatorios["/relatorios"] --> RelatoriosTabs

    RelatoriosTabs --> EstoqueAtualTable & FaturamentoSection & RentabilidadeSection & SugestaoCompraTable & RecorrenciaTable & PeriodoFilter & FilialFilter

    PedidoForm --> ProductAutocomplete
    NFeImport --> ProductAutocomplete2["ProductAutocomplete"]
    PromocaoForm --> ProductAutocomplete3["ProductAutocomplete"]
```

## 4. Mapa de componentes reutilizados (grafo de reuso)

```mermaid
flowchart LR
    ProductAutocomplete((ProductAutocomplete)) --- PedidoForm
    ProductAutocomplete --- NFeImport
    ProductAutocomplete --- PromocaoForm

    HistoricoPedidos((HistoricoPedidos)) --- PgPedidos["/pedidos"]
    HistoricoPedidos --- PgEntrada["/entrada"]
    HistoricoPedidos --- MovimentacoesToggle --- PgMovimentacao["/movimentacao"]

    NFeImport -.contido em.-> PedidoForm

    style ProductAutocomplete fill:#1E66F5,color:#fff
    style HistoricoPedidos fill:#1E66F5,color:#fff
```

**Leitura**: `ProductAutocomplete` e `HistoricoPedidos` são os únicos 2 componentes do projeto com reuso real entre múltiplas telas (ver `COMPONENT_INVENTORY.md`, seção "Resumo de reuso"). Todo o resto do grafo de 25 componentes é composto de folhas de uso único — sintoma direto da ausência de Design System (`DESIGN_SYSTEM_ANALYSIS.md`).

## 5. Duplicações estruturais (para visualizar o `DESIGN_DEBT.md`)

```mermaid
flowchart TD
    subgraph "Conceito: Abas"
        direction LR
        Tabs1[RelatoriosTabs.tsx<br/>pills arredondadas] -.duplica ideia de.-> Tabs2[MovimentacoesToggle.tsx<br/>2 botões primary/secondary]
    end

    subgraph "Conceito: Seletor de Filial"
        direction LR
        Sel1[FilialSwitcher.tsx<br/>grava cookie] -.duplica ideia de.-> Sel2[FilialFilter.tsx<br/>grava query param]
    end

    subgraph "Conceito: Tabela de dados"
        direction LR
        T1[EstoqueAtualTable] & T2[FaturamentoSection] & T3[RentabilidadeSection] & T4[RecorrenciaTable] & T5[SugestaoCompraTable] & T6[HistoricoPedidos] -.6 implementações da mesma estrutura HTML.-> Concept[("&lt;table&gt; genérica")]
    end
```

---

## Screenshots organizadas por página

Ver `/docs/export/screenshots/README.md` — a captura de imagem não foi possível nesta sessão (ver nota técnica em `SCREENSHOTS.md`); a pasta contém a descrição de como as capturas devem ser organizadas quando regeradas.

## Diagramas não gerados automaticamente — como estruturá-los manualmente

Todos os diagramas solicitados foram gerados em Mermaid acima. Caso a equipe precise de uma versão em ferramenta visual (Figma/FigJam/Excalidraw) em vez de Mermaid:
- **Mapa de rotas**: reproduzir o diagrama 1 como fluxograma, mantendo os losangos de decisão (sessão válida? aprovado? papel?) — são exatamente as 3 condições que controlam todo redirecionamento no app (`lib/auth.ts` do ponto de vista de efeito na UI, não de implementação).
- **Árvore de navegação**: reproduzir o diagrama 2 como 3 colunas lado a lado (uma por papel), cada uma sendo a lista vertical exata que aparece na Sidebar real.
- **Mapa de componentes**: reproduzir o diagrama 4 como um grafo de nós, com o tamanho do nó proporcional ao número de telas que o consomem (útil para priorizar o que migrar primeiro pro Design System).
