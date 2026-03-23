

## What the PDFs reveal — the data model

**PR_Mar26.pdf** is a full research report with:
- **Methodology block**: institute, date, territory, sample size, margin of error, collection method
- **Results sections** organized by cargo (Governador, Senador) and question type:
  - Espontânea (open-ended)
  - Estimulada Cenário 1, 2, 3... (stimulated voting — multiple candidate slates)
  - Comparativo (trend table: same question across multiple months/waves)
  - Rejeição (rejection RM*)
  - Avaliação da Administração (approval/disapproval + historical trend)
- **Cross-tabs per result**: every scenario has a sub-table broken by: Gênero, Faixa Etária, Escolaridade, Nível Econômico (PEA/Não PEA), Religiosidade

**Pesquisa_estadual_mar2026.pdf** is a pure tabulation file with color-coded cross-tab tables (sub/over-represented).

---

## Architecture of the new Pesquisas page

The page will be rebuilt with **3 main tabs**:

```
[ Biblioteca ]  [ Analisar ]  [ Cruzar Pesquisas ]
```

### Tab 1 — Biblioteca
- Upload area (drag & drop PDF)
- Cards for each registered research showing: institute, territory, cargo, date, sample, margin
- "Importar PDF" button that opens a modal with tabulation preview extracted from the PDF patterns

### Tab 2 — Analisar (single research analysis)
- Select a research from a dropdown
- Sub-tabs per cargo: **Governador** | **Senador**
- For each cargo, sections:
  1. **Espontânea** — horizontal bar chart
  2. **Estimulada** — tab per cenário, bar chart + cross-tab table (filterable by: Gênero / Faixa Etária / Escolaridade / Renda / Religiosidade)
  3. **Rejeição** — bar chart + cross-tab
  4. **Aprovação** — gauge/bar + historical trend line chart (comparativo)

### Tab 3 — Cruzar Pesquisas
- Multi-select up to 4 researches (checkboxes)
- Select metric: Intenção Estimulada / Rejeição / Aprovação
- Select candidate to track
- Output: side-by-side comparison line chart (evolution over dates) + table showing delta between waves

---

## Data model to create

New TypeScript interfaces in `src/data/mockData.ts` and a new `src/data/pollsData.ts`:

```
PollWave {                        ← one research wave/document
  id, institute, territory, cargo,
  collectionStart, collectionEnd,
  releaseDate, sampleSize, marginOfError,
  methodology, tseRegistration
}

PollQuestion {                    ← one question inside a wave
  id, waveId,
  cargo: 'governador' | 'senador'
  questionType: 'espontanea' | 'estimulada' | 'rejeicao' | 'aprovacao'
  scenarioLabel: string           ← e.g. "Cenário 1", "Cenário 2"
  results: CandidateResult[]      ← overall %
  crossTabs: CrossTab[]           ← breakdowns by filter
}

CandidateResult { candidate, percentage }

CrossTab {
  filterType: 'genero' | 'faixa_etaria' | 'escolaridade' | 'renda' | 'religiosidade'
  rows: CrossTabRow[]
}

CrossTabRow { label, values: Record<candidate, percentage> }
```

Pre-populate with data extracted from **PR_Mar26.pdf** (the two PDFs already uploaded) so the interface is not empty on first load.

---

## Files to create / modify

1. **`src/data/pollsData.ts`** — new file with full typed data model + pre-populated data from PR_Mar26.pdf (Governador cenários 1-3, Senador cenários 1-2, Rejeição Governador, Rejeição Senador, Aprovação + comparativo)

2. **`src/pages/Pesquisas.tsx`** — full rewrite:
   - 3-tab layout (Biblioteca / Analisar / Cruzar)
   - Tab 1: upload card + research library cards
   - Tab 2: cargo sub-tabs + question type sections with bar charts + collapsible cross-tab tables with filter selector
   - Tab 3: multi-select + comparison line chart

3. **`src/components/polls/CrossTabTable.tsx`** — reusable cross-tab table component with color intensity (green = highest, red = lowest in row, matching PDF heat-map style)

4. **`src/components/polls/CandidateBarChart.tsx`** — horizontal bar chart for candidate results with color-coded bars per candidate

No new dependencies needed — Recharts (already installed) handles all charts.

---

## Key UX decisions based on PDF patterns

- The PDF uses **color coding** (green = over-represented, red = sub-represented) in cross-tabs → replicate with conditional cell background opacity
- Multiple **cenários** per cargo (Cenário 1, 2, 3 for Governador) → tabs within the question section
- **Comparativo** tables show historical trend (Jan/25 → Mar/26 with 7 waves) → already perfect for Recharts LineChart
- The "Cruzar" mode tracks one candidate across multiple waves — the comparativo table in the PDF is exactly this pattern

