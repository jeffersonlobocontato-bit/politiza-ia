# Modo de Impressão em Escala — Mapa Estratégico

Adiciona um botão **"Imprimir mapa"** no Mapa Estratégico que abre uma tela dedicada de pré-visualização (Print Preview), pensada para gerar PDF/impressão física em escala A4/A3/A2, com pins distribuídos dentro dos limites de cada cidade (sem sobreposição), legenda no rodapé e big numbers por categoria.

---

## 1. Botão e entrada

- Botão `Imprimir mapa` no painel lateral do `MapaEstrategico.tsx`, ao lado dos toggles atuais.
- Abre rota dedicada `/mapa/imprimir` (página standalone, sem sidebar/topbar) ou um modal fullscreen — **rota dedicada** é melhor porque permite `window.print()` limpo, exportar PDF e compartilhar link.
- Recebe via `searchParams` os filtros já aplicados no mapa (candidato ativo, associação, etc.) para herdar contexto.

## 2. Painel de configuração da impressão (lado esquerdo, oculto no print via `@media print`)

**a) Formato do papel:** A4, A3, A2 — retrato/paisagem (6 opções). Define `width × height` em mm do container de impressão e a escala dos pins.

**b) Camadas imprimíveis (checkboxes com contador ao vivo):**
1. Lideranças CRM
2. Ativos políticos
3. Membros da campanha
4. Emendas parlamentares (com sub-filtro por faixa F1–F7)
5. Candidatos
6. Engajamento territorial (choropleth — substitui pins por preenchimento das cidades)

**c) Opções extras:**
- Mostrar nomes das cidades (sim/não — auto-oculta cidades pequenas demais para a escala)
- Mostrar contorno das Associações (sim/não)
- Título do mapa + subtítulo (editáveis — ex: "Mapa Estratégico — Candidato X — Junho/2026")
- Logo/cabeçalho da campanha

**d) Ações:** `Imprimir` (`window.print()`), `Baixar PDF` (via `html2canvas` + `jsPDF` ou só `window.print()` → "Salvar como PDF").

## 3. Fundo cartográfico (confirmado)

Renderizado em um `<MapContainer>` sem tiles base (fundo branco puro):

- **Polígonos das 399 cidades**: preenchimento `#FFFFFF`, contorno `#9CA3AF` 0.6px (IBGE GeoJSON já em uso via `PrAssociationChoropleth`).
- **Nome de cada cidade**: label DM Sans 7–9px (escala dependente), cor `#374151`, halo branco, posicionado no centroide do polígono (usa `turf.centroid` ou cálculo manual sobre as coords). Esconde label se a área do polígono em pixels < threshold da escala atual.
- **19 Associações de Municípios**: contorno `#64748B` 1.8px + preenchimento pastel translúcido (`hsl(h, 35%, 92%)`, opacity 6–8%) com hue derivado do acrônimo (reusa `colorForAssoc` ajustando saturação/luminosidade).
- **Curitiba**: contorno próprio Navy `#1A2A45` 2px, sem preenchimento pastel (destacada da RMC).

## 4. Anti-sobreposição de pins (núcleo técnico)

Para cada cidade, agrupa todos os pins de todas as camadas selecionadas e os redistribui dentro do polígono:

```text
Para cada cidade C com N pins:
  1. Calcular bbox e centroide do polígono em coords lat/lng
  2. Calcular raio do polígono em pixels na escala atual (depende do papel)
  3. Definir tamanho do pin = clamp(área_polígono_px / N, MIN_PIN, MAX_PIN)
  4. Se N == 1 → posiciona no centroide
  5. Se N <= 7 → distribui em círculo concêntrico (Poisson-disk simples)
  6. Se N >  7 → grid hexagonal dentro da bbox, filtrando pontos fora do polígono
                 (point-in-polygon ray casting)
  7. Garantir distância mínima entre pins = tamanho_pin * 1.4
  8. Se não couber, reduz tamanho_pin proporcionalmente
```

Implementação: hook `useDistributedPins(polygons, pins, paperScale)` que retorna `Array<{ pinId, lat, lng, sizePx }>` memoizado. Usa `@turf/turf` (já candidato a dep) ou implementação manual leve.

**Escala responsiva dos pins:**
- A4: pin base 6–14px
- A3: pin base 8–18px
- A2: pin base 10–24px

Tamanho final = `base * (1 / log(N+1))` para que cidades densas tenham pins menores mas ainda visíveis.

## 5. Rodapé do mapa impresso

Faixa fixa abaixo do mapa (parte do papel imprimível), dividida em colunas:

```text
┌──────────────────────────────────────────────────────────────────┐
│                          [ MAPA ]                                │
├──────────────────────────────────────────────────────────────────┤
│ ● Lideranças CRM   142   ◆ Emendas  87   ▲ Ações  56   ★ ...    │
│   (cor verde)            (cor por faixa)  (cor azul)             │
│                                                                  │
│ Subtotais por faixa de emenda: F7 ●3  F6 ●8  F5 ●22  ...        │
└──────────────────────────────────────────────────────────────────┘
```

Cada item da legenda: ícone/cor do pin + título da tag + **big number** ao lado (font-weight 700, 18–24pt conforme papel). Faixas de emenda em sub-linha quando a camada está ativa.

## 6. CSS de impressão

```css
@media print {
  @page { size: A3 landscape; margin: 8mm; }
  /* esconde header, sidebar, painel de config */
  /* força fundo branco, cores exatas (print-color-adjust: exact) */
}
```

A página de preview já renderiza no tamanho exato do papel escolhido (`width: 297mm` etc.), então o que se vê na tela é o que sai impresso (WYSIWYG).

---

## Detalhes técnicos

**Arquivos novos:**
- `src/pages/MapaEstrategicoImpressao.tsx` — página standalone com layout de papel
- `src/components/maps/print/PrintMapCanvas.tsx` — MapContainer dedicado, sem tiles, com fundo branco
- `src/components/maps/print/PrintLegendFooter.tsx` — rodapé com big numbers
- `src/components/maps/print/PrintConfigPanel.tsx` — painel lateral de configuração
- `src/hooks/useDistributedPins.ts` — algoritmo anti-sobreposição
- `src/lib/printScale.ts` — constantes de papel (A4/A3/A2 em mm, escala de pins)
- `src/lib/polygonUtils.ts` — centroide, área, point-in-polygon, distribuição

**Arquivos editados:**
- `src/pages/MapaEstrategico.tsx` — adicionar botão "Imprimir mapa" → navega para `/mapa/imprimir?...`
- `src/App.tsx` — rota `/mapa/imprimir` (sem layout padrão)
- `src/components/maps/PrAssociationChoropleth.tsx` — expor variante `mode="print"` com paleta pastel suave + Curitiba destacada

**Dependências:**
- `@turf/turf` (já útil para tracking; usar `@turf/centroid`, `@turf/boolean-point-in-polygon`, `@turf/area`)
- Sem libs de PDF inicialmente — `window.print()` + "Salvar como PDF" do navegador atende. `jsPDF`/`html2canvas` ficam como evolução se necessário.

**Performance:**
- `useDistributedPins` memoiza por `(cidadeId, layersAtivas, escalaPapel)` para não recalcular a cada render
- GeoJSON do IBGE já está em cache (`staleTime: 24h`)

---

## Fora de escopo (não nesta entrega)
- Editor visual de posição manual de pins (drag-and-drop)
- Múltiplos mapas por documento (multi-página)
- Watermark/branding customizado por cliente
- Anotações desenhadas à mão no mapa
