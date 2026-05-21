# Corrigir PDF do organograma cortando textos

## Problema
No PDF exportado, a segunda linha de texto de cada card (cargo/função, ex.: "Coordenador de Logística", "Coronel Adilson") aparece com a parte inferior cortada (descendentes "g", "p" sumindo).

Causa raiz em `src/components/hierarquia/HierarchyFlowchart.tsx`:
- `DeptCard` usa `truncate` + `leading-tight` + fontes muito pequenas (`text-[9px]`/`text-[10px]`/`text-[11px]`).
- O `html2canvas` calcula a altura do nó com base no `line-height` apertado e ainda aplica `overflow:hidden` do `truncate`, fazendo o renderer clipar descendentes e qualquer texto que ultrapasse uma linha.
- O `padding` vertical do card (`py-1.5`/`py-2`) é insuficiente para a renderização do canvas em escala 3x.

## Solução (somente camada de apresentação)

### 1. Modo "export" no `DeptCard`
Adicionar prop opcional `exportMode?: boolean`. Quando `true`:
- Remover `truncate` (deixar `whitespace-normal break-words`) em label, nome e cargo.
- Trocar `leading-tight` por `leading-snug` (~1.35) para acomodar descendentes.
- Aumentar padding vertical (`py-2.5` / `py-3`) e o tamanho mínimo do card.
- Garantir `overflow: visible` no container do card.

### 2. Aplicar `exportMode` durante a captura
Em `handleDownloadPdf`:
- Antes de chamar `html2canvas`, setar um estado `isExporting` que faz todos os `DeptCard` renderizarem em `exportMode`.
- Aguardar `requestAnimationFrame` (ou pequeno `setTimeout`) para o React aplicar antes de capturar.
- Após a captura (ou em `finally`), restaurar o modo normal.

### 3. Ajustes do `html2canvas`
- Manter `scale: 3`.
- Adicionar `onclone` para forçar nos clones: `overflow: visible`, remover qualquer `text-overflow: ellipsis` herdado e aplicar `line-height: 1.4` global no container do chart.
- Continuar usando `windowWidth/Height = scrollWidth/scrollHeight` para capturar o canvas inteiro.

### 4. Página única bem dimensionada (sem cortes nas bordas)
- Manter formato dinâmico `[wMm+20, hMm+20]` com 10mm de margem.
- Adicionar checagem: se `wMm` > 1000mm (limite prático do jsPDF), reduzir proporcionalmente mantendo qualidade.

## Arquivos afetados
- `src/components/hierarquia/HierarchyFlowchart.tsx` (único arquivo)

## Verificação
1. Abrir `/hierarquia` → "Organograma" → "Baixar PDF".
2. Conferir cada card: label, nome e cargo completos, sem letras descendentes cortadas.
3. Verificar que o layout na tela (sem export) permanece idêntico (truncate ainda ativo no modo normal).
