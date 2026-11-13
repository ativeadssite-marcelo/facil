## Objetivo

Fazer o botão "Novo Produto" dentro da tela de Orçamentos abrir o mesmo `ProdutoModal` completo usado em Produtos, com paridade total de funcionalidades.

## Diagnóstico

Hoje os dois pontos já usam `src/components/ProdutoModal.tsx`, mas em `src/pages/Orcamentos.tsx` o modal é instanciado com uma configuração reduzida e a função de salvar não cobre todos os comportamentos da página Produtos.

Diferenças identificadas:

1. `customCategorias={[]}` em Orcamentos → o dropdown de Categoria não mostra as categorias customizadas já cadastradas pelos produtos existentes (em Produtos é passado `filterCategorias`, derivado de `allProdutos`).
2. `markupPadrao` já é carregado igual ao Produtos — OK.
3. `cadastrarProduto` já cria produto + lote inicial + atualiza estoque, mas:
   - Não trata cenário de "lote sem fornecedor mas com quantidade" (em Produtos a regra é `lote.fornecedor && lote.quantidade > 0`, mesma — OK).
   - Não invalida a query `['produtos']` da tela Produtos com o mesmo formato (já invalida — OK).
4. O modal em Orcamentos atualmente só cria; não permite editar. Mantemos assim (em Orçamentos só faz sentido criar novo produto durante a venda).

## Alterações

### `src/pages/Orcamentos.tsx`

1. Calcular `customCategorias` a partir dos produtos existentes (mesmo padrão do `filterCategorias` de Produtos): buscar/derivar a lista única de `categoria` de todos os produtos cadastrados e passar ao `ProdutoModal`.
   - Reaproveitar a query `produtos-search` não cobre tudo (ela é filtrada). Adicionar uma query leve `['produtos-categorias']` que faz `select('categoria')` distintos, com `staleTime` alto.
2. Substituir `customCategorias={[]}` por `customCategorias={categoriasDisponiveis}`.
3. Garantir que após cadastrar o produto novo, ele seja inserido no orçamento já com `codigo_interno` e demais campos retornados (já é feito via `select(...)` no insert — manter).
4. Conferir que o `select` do insert inclui todos os campos consumidos por `ProdutoDB` ao adicionar no carrinho (já inclui).

### `src/components/ProdutoModal.tsx`

Nenhuma alteração — o componente já contém todos os campos (Código Fábrica, Categoria com "+ nova", Tipo Veículo, Marca, Fornecedor, Aplicação, NCM, Preço de Custo, Quantidade Inicial, Markup, ICMS/IPI/PIS/COFINS, Preço de Venda calculado, Estoque Mínimo, Código Interno automático).

## Resultado esperado

Ao clicar em "Novo Produto" dentro de Orçamentos:
- Abre o mesmo modal completo da página Produtos.
- Categorias customizadas existentes aparecem no dropdown.
- Markup padrão herda da configuração global.
- Cadastro grava produto, lote inicial, estoque, e adiciona o item ao orçamento automaticamente.
