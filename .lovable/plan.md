## Objetivo
1. Aproveitar toda a largura disponível no Mapa do Paraná (hoje limitado por `max-w-7xl` da página).
2. Permitir alternar a camada das associações entre: **Cores** (atual), **Contornos** (mapa branco, só linhas finas das cidades — melhor contraste dos pins) e **Oculto**.

## Mudanças

### `src/pages/Emendas.tsx`
- Aba "Mapa do Paraná" renderiza fora do container `max-w-7xl`: envolver `<TabsContent value="mapa">` com um wrapper que aplica `mx-[-1rem] md:mx-[-1.5rem]` (cancela o padding lateral da página) e `max-w-none`, deixando o mapa ocupar 100% da largura do viewport (descontando a sidebar do app).
- Aumentar altura: `calc(100vh - 180px)`.
- No painel lateral do mapa, adicionar bloco **"Camada de fundo"** com 3 botões segmentados:
  - `Cores` — choropleth atual por associação
  - `Contornos` — fundo branco + GeoJSON sem preenchimento, apenas borda cinza fina
  - `Oculto` — só o tile claro do CARTO
- Passar o modo escolhido como prop ao componente da camada.

### `src/components/maps/PrAssociationChoropleth.tsx`
- Aceitar prop `mode: 'colored' | 'outline' | 'hidden'`.
  - `colored`: comportamento atual.
  - `outline`: `fillOpacity: 0`, `color: '#94a3b8'`, `weight: 0.5` — só contornos.
  - `hidden`: retorna `null`.
- A `PrAssociationLegend` só é exibida no modo `colored` (esconder no painel quando não fizer sentido).

### Tile do mapa
- Quando `mode === 'outline'`, trocar o tile CARTO para fundo branco puro (não exibir `TileLayer`) ou usar `light_nolabels` com baixa opacidade. Mantém pins com altíssimo contraste sobre branco.

## Resultado
- Mapa ocupa toda a largura útil da página.
- Usuário pode tirar as cores das associações com 1 clique e enxergar os pins de emendas isolados sobre o contorno cinza claro do Paraná.