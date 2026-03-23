
## Diagnóstico do problema

**Root cause**: A ordem dos `@import` em `src/index.css` está incorreta.

```text
ATUAL (quebrado):
  @tailwind base;           ← aplica reset global ANTES do Leaflet
  @tailwind components;
  @tailwind utilities;
  @import url(Google Fonts)
  @import "leaflet/..."     ← importado DEPOIS, mas PostCSS já processou os @tailwind

CORRETO:
  @import url(Google Fonts)  ← todos @import primeiro
  @import "leaflet/..."
  @tailwind base;            ← depois as diretivas Tailwind
  @tailwind components;
  @tailwind utilities;
```

O PostCSS/CSS exige que todos os `@import` venham antes de qualquer regra CSS. Quando `@tailwind base` vem primeiro, ele injeta um reset CSS global (incluindo `*, *::before, *::after { box-sizing: border-box; }` e remove heights) que faz os elementos SVG do Leaflet perderem altura e `z-index`, tornando os CircleMarkers invisíveis.

**Segundo problema**: A camada do mapa na `SalaDeGuerra` só mostra ações na view "Operacional", mas o padrão é "Calor" (apenas municípios). Na view padrão do usuário os pins de ações não aparecem porque estão apenas em `mapView === 'operacional'`. Precisa deixar a view padrão como "Operacional" para ver os pins de ações de campo.

**Terceiro problema**: Falta um `leaflet-fix` no `main.tsx` para resolver o problema de ícone default do Leaflet no Vite (causa warnings e pode afetar renderização SVG).

## Arquivos a editar

### 1. `src/index.css`
Mover os `@import` para o topo, antes dos `@tailwind`:
```css
@import url('https://fonts.googleapis.com/...');
@import "leaflet/dist/leaflet.css";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 2. `src/main.tsx`
Adicionar fix padrão do Leaflet + Vite para corrigir ícones:
```ts
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
```

### 3. `src/pages/SalaDeGuerra.tsx`
Mudar o estado inicial do mapView de `'calor'` para `'operacional'` para que os pins de ações de campo sejam exibidos por padrão.

### 4. `src/pages/MapaEstrategico.tsx`
Garantir que a camada padrão seja `'acoes'` (já está correta) e adicionar validação de coordenadas nos CircleMarkers para evitar pins em coordenadas `undefined/NaN`:
```ts
filteredActions.filter(a => a.lat && a.lng && !isNaN(a.lat) && !isNaN(a.lng))
```

## Resumo do impacto

- Fix da ordem CSS: resolve o principal bug visual onde os CircleMarkers ficam "invisíveis"
- Fix do Leaflet icon: elimina os warnings de ref e garante SVG estável
- Default view "Operacional": pins de ações aparecem imediatamente ao abrir a Sala de Guerra
- Filtro de coordenadas: previne erros silenciosos com ações sem lat/lng definidos
