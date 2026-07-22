# SCREENSHOTS.md — Inventário Visual de Telas (Omnix Connect)

## Nota metodológica importante

O mecanismo de captura de imagem do ambiente de auditoria (screenshot do Browser pane) apresentou falha técnica persistente nesta sessão (timeout em toda tentativa, em múltiplas páginas e após reinício do navegador) — não foi possível gerar arquivos de imagem. Em conformidade com a instrução de que "caso algum diagrama não possa ser gerado automaticamente, descreva claramente como ele seria estruturado", este documento substitui cada screenshot por uma **descrição textual detalhada da árvore de acessibilidade/DOM real da tela**, obtida navegando a aplicação ao vivo. Isso preserva fidelidade total ao conteúdo e à estrutura de cada tela, só sem a imagem em si.

**Como as telas foram visitadas com segurança**: todas as capturas abaixo foram feitas em uma **conta de teste descartável** criada via `/cadastro` especificamente para esta auditoria (nunca na conta real de produção), com produtos e promoções fictícios ("Vinho Tinto Exemplo", "Espumante Exemplo Brut") criados só para preencher as telas. Nenhum dado real de cliente, funcionário ou negócio aparece nas descrições abaixo.

**Para gerar as imagens reais posteriormente**: repetir a navegação abaixo com o Browser pane funcional, ou usar as instruções de `EXPORT.md` (pasta `/docs/export`).

---

### 1. Login
- **Rota**: `/`
- **Arquivo**: `app/page.tsx` + `components/LoginForm.tsx`
- **Descrição**: Card centralizado (largura máx. ~448px) sobre fundo neutro. Título "🍷 Adegas" + subtítulo "Gestão de estoque e vendas". Campos E-mail e Senha, botão "Entrar" (pill, cor de destaque). Abaixo, link "Cadastre sua Adega". Um segundo card menor lista credenciais de demonstração.
- **Screenshot correspondente**: não gerado (ver nota acima).

### 2. Cadastro
- **Rota**: `/cadastro`
- **Arquivo**: `app/cadastro/page.tsx` + `components/CadastroForm.tsx`
- **Descrição**: Mesmo padrão visual do login. 6 campos: Nome da Empresa, CNPJ ou CPF, Seu Nome Completo, Contato (telefone/WhatsApp), E-mail de Acesso, Senha. Botão "Cadastrar e Entrar". Link "Já tem uma conta? Faça login".
- **Screenshot correspondente**: não gerado.

### 3. Aguardando aprovação
- **Rota**: `/aguardando-aprovacao`
- **Arquivo**: `app/aguardando-aprovacao/page.tsx`
- **Descrição**: Tela centralizada, sem menu lateral (usuário ainda sem acesso liberado). Título "Conta aguardando aprovação" (ou "Assinatura vencida", condicional), parágrafo explicando o próximo passo. Nenhum botão de ação — só texto informativo.
- **Screenshot correspondente**: não gerado (visitado ao vivo com a conta de teste, confirmado o texto exato).

### 4. Acesso negado
- **Rota**: `/acesso-negado`
- **Arquivo**: `app/acesso-negado/page.tsx`
- **Descrição**: Tela centralizada. Título "Acesso negado", parágrafo curto, botão "Voltar para Pedidos".
- **Screenshot correspondente**: não gerado (não navegada ao vivo nesta sessão — lida via código-fonte).

### 5. Pedidos (Caixa)
- **Rota**: `/pedidos`
- **Arquivo**: `app/pedidos/page.tsx`
- **Descrição**: Layout de 2 colunas (`1.15fr`/`0.85fr` em desktop). Coluna esquerda: campo de busca de produto ("Adicionar produto ao pedido de saída"). Coluna direita (painel fixo/sticky): "Pedido de saída" com lista de itens do carrinho (nome, categoria, seletor de quantidade, campo de valor unitário — desabilitado para funcionário —, subtotal), total geral em destaque (fonte grande, tabular), seletor "Forma de pagamento" (Cartão/Dinheiro/Pix/Fiado), botão "Fechar pedido de saída". Abaixo de tudo, "Últimos pedidos": tabela expansível com colunas Pedido/Data/Itens/Total/Pagamento/Usuário, cada linha clicável para expandir os itens.
- **Screenshot correspondente**: não gerado (visitado ao vivo — estado vazio "Nenhum produto no pedido de saída ainda" e "Nenhum pedido registrado ainda" confirmados com a conta de teste).

### 6. Entrada
- **Rota**: `/entrada`
- **Arquivo**: `app/entrada/page.tsx`
- **Descrição**: Mesma estrutura de `/pedidos`, mas type="IN": acima do campo de busca, card "Importar Nota Fiscal (XML)" com botão "Escolher arquivo XML". Título do painel direito é "Pedido de entrada", forma de pagamento mostra Boleto/Dinheiro/Pix (não Cartão/Fiado), com campo extra de "dias de vencimento" quando Boleto é selecionado. Histórico abaixo rotulado "Últimas entradas".
- **Screenshot correspondente**: não gerado (visitado ao vivo — estado vazio confirmado).

### 7. Movimentações
- **Rota**: `/movimentacao`
- **Arquivo**: `app/movimentacao/page.tsx`
- **Descrição**: Título + descrição, 2 botões ("Saída"/"Entrada", estilo btn-primary/btn-secondary alternando), abaixo a tabela `HistoricoPedidos` do tipo selecionado — sem carrinho, é só consulta.
- **Screenshot correspondente**: não gerado (lida via código — não revisitada ao vivo nesta sessão específica).

### 8. Produtos (catálogo)
- **Rota**: `/produtos`
- **Arquivo**: `app/produtos/page.tsx`
- **Descrição**: Cabeçalho com título, descrição, botões "Exportar planilha" (+"Importar planilha" se habilitado) e "+ Novo produto" à direita. 2 cards de KPI ("Valor total em estoque (custo)", "Produtos abaixo do mínimo"). Tabela com colunas Código/Nome/Categoria/Estoque/Status(pill OK/Baixo/Zerado)/Custo/Venda/link "Ver".
- **Screenshot correspondente**: não gerado. **Estado real capturado** (conta de teste, 2 produtos fictícios): KPI "Valor total em estoque (custo)" = R$ 800,00, "Produtos abaixo do mínimo" = 1. Linhas: `0002 Espumante Exemplo Brut / Espumante / 2 un / Baixo / R$ 40,00 / R$ 79,90`; `0001 Vinho Tinto Exemplo / Vinho Tinto / 24 un / OK / R$ 30,00 / R$ 59,90`.

### 9. Novo Produto
- **Rota**: `/produtos/novo`
- **Arquivo**: `app/produtos/novo/page.tsx`
- **Descrição**: Título "Novo produto" + formulário em grid de 2 colunas (nome ocupa as 2), campos: Nome, Categoria (com sugestões via datalist), Unidade, Preço de custo, Preço de venda, Estoque inicial, Alerta de estoque mínimo, "Entra como" (select Somente unidade/Caixa/Pacote), campo condicional "Unidades por caixa/pacote". Botão "Cadastrar produto".
- **Screenshot correspondente**: não gerado (preenchido e submetido ao vivo com dados fictícios: "Vinho Tinto Exemplo").

### 10. Detalhe de Produto
- **Rota**: `/produtos/[id]`
- **Arquivo**: `app/produtos/[id]/page.tsx`
- **Descrição**: Cabeçalho com nome do produto + badges (Inativo/Em promoção, condicionais), categoria, botões Voltar/Editar/Inativar. Card "Dados do produto" (lista definição: Unidade, Estoque atual, Entra como, Preço de custo, Preço de venda, Alerta de estoque mínimo, Código). Se houver promoções vinculadas, card adicional "Promoções deste produto" com lista + link "Gerenciar".
- **Screenshot correspondente**: não gerado. **Estado real capturado** (produto fictício "Vinho Tinto Exemplo"): Unidade "un", Estoque atual "24 un", Entra como "Somente unidade", Preço de custo "R$ 30,00", Preço de venda "R$ 59,90", Alerta de estoque mínimo "5 un", Código "0001".

### 11. Editar Produto
- **Rota**: `/produtos/[id]/editar`
- **Arquivo**: `app/produtos/[id]/editar/page.tsx`
- **Descrição**: Idêntico ao formulário de Novo Produto, mas com campo extra somente-leitura "Código" e valores pré-preenchidos; sem campo de estoque inicial (estoque não é editável diretamente aqui).
- **Screenshot correspondente**: não gerado (lida via código-fonte).

### 12. Promoções
- **Rota**: `/promocoes`
- **Arquivo**: `app/promocoes/page.tsx`
- **Descrição**: Título + descrição explicando o comportamento de expiração automática. Card "Promoções cadastradas" (lista com nome do produto, preço promocional, quantidade mínima/período se houver, badge de status Ativa/Agendada/Expirada, botão Remover). Card "Nova promoção": autocomplete de produto, campo Preço promocional, 2 campos de data (Início/Fim, opcionais), campo Quantidade mínima (opcional), botão "+ Nova promoção".
- **Screenshot correspondente**: não gerado. **Estado real capturado** (com 1 promoção fictícia criada durante o teste): "Vinho Tinto Exemplo — R$ 44,90 · a partir de 6 un." com status exibido (nota: neste teste específico o status apareceu como "Expirada" por um comportamento das datas em branco, já reportado separadamente como item técnico fora do escopo desta auditoria visual).

### 13. Filiais
- **Rota**: `/filiais`
- **Arquivo**: `app/filiais/page.tsx`
- **Descrição**: Título + descrição. Card "Filiais cadastradas" (lista nome + data de criação, contador "X de Y licenciada(s)"). Card "Nova filial": campo de nome + botão, ou mensagem de limite atingido no lugar do formulário.
- **Screenshot correspondente**: não gerado (lida via código-fonte).

### 14. Relatórios
- **Rota**: `/relatorios`
- **Arquivo**: `app/relatorios/page.tsx`
- **Descrição**: Título + descrição (varia por papel). Barra de abas em pill (Estoque/Rentabilidade/Faturamento e volume vendido/Sugestão de compra/Maior recorrência — as 3 últimas só para dono), com filtros de Filial e Período alinhados à direita quando aplicável. Conteúdo de cada aba é uma combinação de cards de KPI + 1 tabela.
- **Screenshot correspondente**: não gerado. **Estado real capturado** (aba Estoque, conta de teste): tabela com Produto/Categoria/Quantidade/Valor em estoque, 2 linhas fictícias, rodapé "Total em estoque (valor de custo) R$ 800,00".

### 15. Layout raiz — Barra lateral (autenticado)
- **Arquivo**: `app/layout.tsx` + `components/NavBar.tsx`
- **Descrição**: Sidebar fixa à esquerda (desktop, 240px) com: nome da empresa no topo (+ seletor de filial se dono e houver múltiplas filiais), lista de links com ícone (Pedidos, Entrada, Movimentações, Relatórios, Produtos, Promoções*, Filiais* — os 2 últimos só dono), e no rodapé nome do usuário + papel + toggle de tema + botão "Sair". Em mobile, vira barra superior compacta + drawer.
- **Screenshot correspondente**: não gerado. **Estrutura confirmada ao vivo** via árvore de acessibilidade da conta de teste (papel Dono): todos os 7 links presentes, nome "Empresa Exemplo Demo" (fictício) exibido corretamente no topo.

---

## Cobertura de Dark Mode

Não foi possível alternar e capturar o tema escuro nesta sessão devido à falha do mecanismo de screenshot. A implementação (`ThemeToggle.tsx` + `app/globals.css`) foi analisada via código-fonte em `DESIGN_SYSTEM_ANALYSIS.md` (seção Dark Mode). Recomenda-se, na próxima sessão com captura funcional, revisitar cada uma das 15 telas acima com `data-theme="dark"` ativo.

## Cobertura de Responsividade

Não foi possível redimensionar e capturar em breakpoints mobile/tablet nesta sessão pelo mesmo motivo. A estrutura responsiva (drawer mobile, grids `sm:`/`md:`) foi analisada via código-fonte.

---

## Nota de atualização

Este documento é um retrato do estado do produto **antes** da Sprint do módulo Dashboard (`app/dashboard`, ver `docs/04-Modules/Dashboard/`). Naquela sprint, com o Browser pane funcional, screenshots reais foram capturadas com sucesso — a técnica de captura via `computer` screenshot funcionou normalmente. Se for útil, posso gerar um SCREENSHOTS.md equivalente para o módulo Dashboard com imagens de verdade.
