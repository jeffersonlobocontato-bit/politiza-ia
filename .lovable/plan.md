
## Problem
The Login page still shows the old branding "CampanhaOS" in 3 places:
1. `<h1>` title: "CampanhaOS"
2. `<p>` subtitle: "Plataforma de Comando e Controle Eleitoral"
3. Footer: "CampanhaOS v2.0 · Backend persistente ativo"

The sidebar is already correct ("Gestão Eleitoral" / "Plataforma de Estratégia Política com IA Integrada").

## Fix
Edit `src/pages/Login.tsx` — 3 text changes:

| Location | Old | New |
|---|---|---|
| `<h1>` line 55 | `CampanhaOS` | `Gestão Eleitoral` |
| `<p>` line 56 | `Plataforma de Comando e Controle Eleitoral` | `Plataforma de Estratégia Política com IA Integrada` |
| Footer line 128 | `CampanhaOS v2.0 · Backend persistente ativo` | `Gestão Eleitoral v2.0 · Backend persistente ativo` |

No other files need changes — `src/types/database.ts` and `src/data/mockData.ts` references are code comments only and have no user-facing impact.
