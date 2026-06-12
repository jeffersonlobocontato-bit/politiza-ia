## Objetivo

Substituir o dropdown "Resultado Percebido" por uma **barra visual 0–100** que pontua cada ação com base em (a) faixa de pessoas impactadas e (b) proporção em relação à população do município. Persistir o score no banco para alimentar **dois rankings** de lideranças (soma e média).

## Fórmula aprovada

**1. Faixa base** (a partir das pessoas impactadas):

| Pessoas | base_score |
|---|---|
| 0 | 0 |
| 1–4 | 10 |
| 5–9 | 20 |
| 10–19 | 35 |
| 20–49 | 50 |
| 50–99 | 65 |
| 100–299 | 75 |
| 300–499 | 85 |
| 500–999 | 92 |
| 1000+ | 100 |

**2. Fator de proporcionalidade** (usando população IBGE, com piso de 2.000 para evitar gaming de cidades minúsculas):

```text
reach_ratio = pessoas_impactadas / max(populacao_municipio, 2000)
prop_factor = 0.4 + 0.6 * min(reach_ratio * 10, 1)
```
→ Ação que atinge ≥10% da cidade ganha fator 1,0; ação grande em cidade grande mantém ao menos 40% do base_score.

**3. Score final da ação:**
```text
impact_score = round(base_score * prop_factor)   // 0–100
```

**Cor da barra:** interpolada vermelho (#E11D48) → amarelo (#F59E0B) → verde (#2FA85A) conforme o score.

## Implementação

### 1. Banco de dados (migration)
- Adicionar `impact_score INTEGER` (0–100, nullable) na tabela `actions`.
- Adicionar `municipality_population_snapshot INTEGER` em `actions` (snapshot da população no momento do registro, para o ranking não mudar se IBGE atualizar depois).
- Verificar/garantir coluna `population` em `municipalities` (caso não exista, criar e popular depois — fora deste escopo).

### 2. Cálculo no frontend (`src/lib/impactScore.ts` — novo)
- `calcBaseScore(people: number): number`
- `calcImpactScore(people: number, population: number): number`
- `scoreColor(score: number): string`
- `scoreLabel(score: number): string` (ex: "Baixo", "Bom", "Excelente")

### 3. `src/pages/CampoAcao.tsx`
- Remover o `<select>` "Resultado Percebido" e o campo `result` do estado.
- Buscar `population` do município selecionado (via query em `municipalities`).
- Renderizar abaixo de "Pessoas Impactadas":
  - Barra horizontal `h-3 rounded-full` com fill colorido e largura = score%.
  - Texto "Pontuação de Impacto: **{score}/100** — {label}".
  - Nota explicativa pequena: "Calculado com base em pessoas impactadas e proporção da cidade."
- Atualizar em tempo real conforme `peopleCount` muda.
- Na tela de confirmação, mostrar o score em vez de "Resultado".
- No submit, gravar `impact_score` e `municipality_population_snapshot`.

### 4. Rankings de Lideranças (2 listas separadas)
Criar página/seção (provavelmente em `src/pages/CampoLiderancas.tsx` ou novo `CampoRanking.tsx` — definir na implementação) com **duas abas**:

- **Ranking por Volume** — `SUM(impact_score)` por liderança (premia esforço).
- **Ranking por Eficiência** — `AVG(impact_score)` por liderança, com mínimo de 3 ações para entrar (evita que 1 ação perfeita domine).

Implementar via RPC `get_leadership_ranking()` no banco para performance, retornando JSON com liderança, total de ações, soma e média de score.

### 5. Compatibilidade
- Ações antigas sem `impact_score` aparecem como "—" nos rankings (não quebram).
- Opcional: script de backfill calculando o score retroativo (decisão posterior).

## Arquivos afetados

- migration SQL (nova coluna + RPC de ranking)
- `src/lib/impactScore.ts` (novo)
- `src/pages/CampoAcao.tsx` (substituir dropdown pela barra, persistir score)
- `src/pages/CampoLiderancas.tsx` ou novo arquivo de ranking (duas abas)
- `src/integrations/supabase/types.ts` (regenerado automaticamente)

## Pendências/Notas

- População por município precisa existir em `municipalities.population`. Se a coluna estiver vazia para o PR, será necessário um seed (fora deste plano — alerto durante a build se estiver faltando).
- Score é calculado client-side antes do insert; o snapshot da população garante reprodutibilidade.
