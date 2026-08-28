# Distribuição de Material — revisão responsiva (mobile)

Revisão visual em viewport de 390px mostrou que o módulo abre com rolagem horizontal do documento: ao trocar de aba, a página inteira desliza para o lado e os cards ficam cortados na borda direita. Além disso, alguns blocos internos passam da largura da tela.

## O que será corrigido

1. **Rolagem horizontal da página inteira**
   - A faixa de abas (`overflow-x-auto -mx-1 px-1`) empurra o conteúdo além da largura da tela. Trocar por um contêiner que role internamente sem estourar o layout (largura contida, sem margens negativas) e impedir overflow horizontal no wrapper do módulo.
   - Resultado: só a barra de abas rola lateralmente; o conteúdo fica sempre alinhado às margens.

2. **Aba Retiradas em Curitiba — checklist de materiais**
   - Hoje é uma tabela de 4 colunas fixas (`Marcar / Material / Quantidade / Observação`) que espreme os campos no celular.
   - No mobile vira uma lista em cartões empilhados: nome + checkbox na primeira linha, quantidade e observação em campos de largura total abaixo. A partir de `sm` mantém a tabela atual.

3. **Aba Entregas por rota — formulário de nova entrega**
   - Linha de material (`select + quantidade + Remover`) quebra em duas linhas no celular, com o botão Remover como ícone alinhado, evitando o campo de quantidade espremido.
   - Blocos de kit por cidade e listas de chips com quebra e truncamento garantidos.

4. **Aba Estoque**
   - Cards de totais em 1 coluna no celular (já previsto) mas com números longos truncando; ajustar tamanho de fonte/quebra para valores como -1.490.690.
   - Select de filtro com largura fixa `w-[220px]` passa a ser fluido (`w-full sm:w-[220px]`).
   - Linhas do histórico de entradas: empilhar texto e ações no mobile.

5. **Aba Lista de entregas**
   - Barra de ações (Relatório Curitiba / Imprimir rotas) e filtros com largura total no celular.
   - Cabeçalho dos cards de entrega (cidade + selo de rota + ações) com quebra, evitando o selo sair da borda.

6. **Aba Itens de campanha**
   - Ajustes menores de largura total nos campos do formulário e truncamento dos nomes longos no portfólio.

7. **App enxuto `/app-logistica`**
   - Mesmo conteúdo, então herda as correções; conferir apenas o padding lateral do `main` para não somar com o padding interno dos cards.

## Detalhes técnicos

- Alterações somente de classes Tailwind/estrutura JSX nos arquivos: `src/pages/DistribuicaoMaterial.tsx`, `src/components/logistica/ListaEntregasTab.tsx`, `src/components/logistica/EstoqueTab.tsx`, `src/components/logistica/ItensCampanhaTab.tsx`.
- Padrão adotado: `min-w-0` em contêineres flex/grid, `flex-wrap`, `truncate` em textos longos, grids `grid-cols-1 sm:grid-cols-N`, e nada de largura fixa em px sem prefixo de breakpoint.
- Nenhuma mudança de lógica, consultas ou dados.
- Verificação final: screenshots em 390px de todas as cinco abas, confirmando `scrollWidth == clientWidth` do documento.
