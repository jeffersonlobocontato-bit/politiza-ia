## Objetivo

Tornar os candidatos visualmente dominantes no mapa da chapa, com pins em forma de gota de geolocalização (não círculos), borda branca, e cores específicas por **partido + cargo** que contrastem com as associações pastéis ao fundo.

## Mudanças (apenas `src/components/chapas/MapaChapa.tsx`)

### 1. Cores por partido + cargo

Substituir o `CARGO_COLOR` atual por uma matriz `PIN_COLOR[party][cargo]`:

- **PL**
  - Deputado Federal: azul forte `#1D4ED8`
  - Deputado Estadual: verde escuro `#15803D`
- **Novo**
  - Deputado Federal: laranja escuro `#C2410C`
  - Deputado Estadual: amarelo mostarda `#CA8A04`

Todos com borda branca de 2px e sombra leve para destacar sobre as cores pastéis das associações.

### 2. Pin em forma de gota (não círculo)

Trocar `CircleMarker` por `Marker` com `L.divIcon` contendo um SVG inline de pin de geolocalização (gota clássica com círculo interno). O SVG recebe `fill` da cor do partido/cargo, `stroke="#FFFFFF"` e `stroke-width=2`. Tamanho ~28x36 px, ancorado na ponta inferior.

### 3. Z-index — pins à frente

Garantir que os pins fiquem acima das polígonas e do heatmap:

- Criar um `<Pane name="pins">` com `style={{ zIndex: 650 }}` (acima do overlayPane padrão = 400).
- Renderizar todos os `<Marker>` dentro desse pane.
- A camada `GeoJSON` permanece no overlayPane padrão e os `Circle` do modo "Calor" em um pane intermediário (`zIndex: 500`) para não cobrir os pins quando ambos estiverem visíveis.

### 4. Legenda atualizada

Atualizar a legenda inferior para refletir as 4 combinações quando aplicável ao partido atual:

- Em `/chapas/PL`: mostra "PL Federal" (azul) e "PL Estadual" (verde escuro).
- Em `/chapas/Novo`: mostra "Novo Federal" (laranja) e "Novo Estadual" (amarelo mostarda).

Usa o prop `party` já recebido pelo componente.

### 5. Tooltip

Mantém o tooltip atual (nome, cargo, cidade, "posição aproximada" quando for o caso). Apenas ajusta o `offset` para a nova âncora do pin (ponta inferior).

## Sem mudanças

- Sem alterações em banco, hooks, `ChapaPartido.tsx`, filtros (Federal/Estadual/Ambos), modo Calor, ou na camada de associações.
- Sem novas dependências — `Marker`, `divIcon` e `Pane` já vêm do `react-leaflet` / `leaflet` instalados.
