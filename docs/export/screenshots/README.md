# Screenshots — Omnix Connect

## Status

A captura de imagem (screenshot) não pôde ser gerada automaticamente nesta sessão de auditoria — o mecanismo de captura do ambiente apresentou falha técnica persistente (timeout) em todas as tentativas, em múltiplas páginas e após reinicialização do navegador. Isso é uma limitação do ambiente desta sessão, não uma restrição do produto ou da tarefa.

Em vez de imagens, cada tela foi documentada com uma **descrição textual completa da estrutura real** (obtida navegando a aplicação ao vivo, com uma conta de teste descartável e dados 100% fictícios) em [`/docs/SCREENSHOTS.md`](../../SCREENSHOTS.md). Esse documento já segue o mesmo padrão pedido aqui (Nome / Rota / Arquivo / Descrição / "Screenshot correspondente" por página).

## Como esta pasta deveria ser organizada quando as imagens forem geradas

```
docs/export/screenshots/
├── README.md                          (este arquivo)
├── 01-login.png
├── 02-cadastro.png
├── 03-aguardando-aprovacao.png
├── 04-acesso-negado.png
├── 05-pedidos.png
├── 05-pedidos--carrinho-preenchido.png
├── 06-entrada.png
├── 06-entrada--importacao-nfe.png
├── 07-movimentacao.png
├── 08-produtos.png
├── 09-produtos-novo.png
├── 10-produto-detalhe.png
├── 11-produto-editar.png
├── 12-promocoes.png
├── 13-filiais.png
├── 14-relatorios--estoque.png
├── 14-relatorios--rentabilidade.png
├── 14-relatorios--faturamento.png
├── 14-relatorios--sugestao-compra.png
├── 14-relatorios--recorrencia.png
├── 15-sidebar.png
└── dark/                              (mesma lista acima, tema escuro)
    └── ...
```

Convenção de nome: `NN-nome-da-rota[--variação].png`, numeração alinhada com a ordem em `SCREENSHOTS.md`. Cada uma deve ser capturada:
1. Com uma **conta de teste descartável**, nunca com dados reais de produção.
2. Em viewport desktop (1280×800) como padrão, com uma segunda passada em mobile (375×812) para as telas mais críticas (Pedidos, Entrada, Produtos).
3. Em ambos os temas (claro/escuro), já que o app tem dark mode funcional.

## Regerando as capturas

Com o ambiente de preview funcional: subir o app (`npm run build && npm run start`, ou o dev server), autenticar com uma conta de teste fictícia (nunca a conta real do usuário), navegar cada rota listada em `/docs/PAGE_INVENTORY.md` e capturar seguindo a convenção acima.
