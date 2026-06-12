## Objetivo
Inverter a ordem das pesquisas no gráfico de variação de cenários (TabCruzar): a mais antiga à esquerda, a mais recente à direita.

## Escopo
Alteração única no componente `Pesquisas.tsx`.

## Implementação
No `useMemo` que monta `chartData` (linha ~1324), adicionar `.reverse()` ao array resultante antes do retorno. Isso inverte a ordem cronológica sem afetar os dados ou a tabela abaixo do gráfico.

## Risco
Nenhum. A mudança é puramente de apresentação e não afeta cálculos, seleções ou persistência.