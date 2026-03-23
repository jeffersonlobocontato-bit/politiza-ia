
## Current state

`TabCruzar` today has a single "Candidato(a)" select that drives a single-line chart for one candidate. The chart only plots that one candidate's trajectory across the selected waves/scenarios.

The user wants to:
1. Keep a "candidato principal" (the focus/highlight)
2. Also select **one or more additional candidates** to compare side-by-side on the same chart

---

## What will change — only `TabCruzar` inside `src/pages/Pesquisas.tsx`

### Control panel redesign (lines ~876–924)

Replace the single candidate `Select` with two parts:

**Candidato Principal** — existing `Select` (single, becomes the highlighted line)

**Candidatos para cruzar** — a multi-select checkbox list that appears below, showing all available candidates (excluding the principal one). Each entry has a colored dot using `CANDIDATE_COLORS`. The user can tick/untick freely. Max suggestion: up to 6 additional lines.

### Chart redesign (lines ~927–982)

Instead of a single `<Line>` → render **one `<Line>` per selected candidate**:
- Principal candidate: `strokeWidth={3}`, solid, with `dot={{ r: 5 }}`
- Comparison candidates: `strokeWidth={2}`, slightly transparent (`opacity={0.75}`), smaller dots (`r: 3`), dashed `strokeDasharray="5 3"`

`chartData` needs restructuring: instead of `{ label, value }` → `{ label, [candidateName]: value, ... }` keyed by candidate name so Recharts can pick up each line's `dataKey`.

### Table at the bottom

Currently shows delta for a single candidate. Will expand to show a column per selected candidate, still with green/red delta coloring.

### State additions inside `TabCruzar`

```
const [comparisonCandidates, setComparisonCandidates] = useState<string[]>([])
```

When `targetCandidate` or `availableCandidates` changes, reset `comparisonCandidates` to empty (auto-cleanup).

---

## Files to modify

**Only `src/pages/Pesquisas.tsx`**, specifically the `TabCruzar` function (~lines 805–991):

1. Add `comparisonCandidates` state
2. Rebuild `chartData` to be multi-candidate keyed
3. Replace the single `Select` with Select + checkbox list
4. Render multiple `<Line>` components
5. Expand the variation table to show all selected candidates

No new dependencies needed — all components already imported.
