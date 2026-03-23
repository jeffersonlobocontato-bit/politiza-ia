
## Problem diagnosis

The "Importar PDF" area in `TabBiblioteca` has a completely empty `onClick={() => {}}` handler — no file input, no modal, no state. It does nothing.

Additionally, `pollWaves` and `pollQuestions` are static constants imported from `pollsData.ts` — so even if a modal existed, new entries couldn't be added to the library dynamically.

The console warnings about `refs on function components` (Select + CartesianGrid in TabCruzar) are React strict-mode warnings but do not break functionality — they will be left as-is to avoid scope creep.

---

## What will be built

### 1. Lift state to page level (`Pesquisas.tsx`)

Add `useState` for `waves` and `questions` at the top-level `Pesquisas` component, initialised from the static data, then pass them down as props to `TabBiblioteca`, `TabAnalisar`, and `TabCruzar`. This allows the import modal to append new entries.

### 2. Import modal inside `TabBiblioteca`

A `Dialog` (already available in the UI kit) triggered when the user clicks the upload area or a hidden `<input type="file" accept=".pdf">`.

**Modal steps:**
- Step 1 — "Arquivo" — file picker confirms the PDF name selected
- Step 2 — "Metadados da pesquisa" — form fields matching `PollWave`:
  - Instituto (text)
  - Território (text, default "Estado do Paraná")
  - Cargos (checkboxes: Governador / Senador)
  - Data de coleta início / fim (date inputs)
  - Data de divulgação (date input)
  - Tamanho da amostra (number)
  - Margem de erro (number, pp)
  - Metodologia (textarea)
  - Registro TSE (text)
- Step 3 — "Dados" (optional, progressive) — a simplified entry for at least one Estimulada question per cargo: candidate name + % pairs, with an "Adicionar candidato" row button.

**On confirm**: Creates a new `PollWave` + at least one `PollQuestion` (estimulada cenário 1) and prepends them to the `waves`/`questions` state arrays. The new card appears immediately in the library.

### 3. Files to modify

**`src/pages/Pesquisas.tsx`** only — no other file needs changing:
- Add `useState` for `waves`, `questions`, `comparativos` (initialised from pollsData exports)
- Add modal state: `modalOpen`, `step` (1–3), and form field state
- Wire the file input `ref` to the upload area click
- Build the 3-step `Dialog` form
- Pass `waves` and `questions` as props through to sub-components

No new dependencies — `Dialog`, `Input`, `Label`, `Textarea`, `Checkbox`, `Badge` are all already in the UI kit.
