# Módulo de Produtividade Hierárquica

Novo módulo acessível **apenas a admin master** (Jefferson, Edson, Julio) que consolida a produtividade de campo a partir do `impact_score` das ações, respeitando a cadeia de comando.

## Lógica de agregação

```text
Ação (impact_score)
   └─ pertence à Liderança (created_by ou coordinator_id)
        └─ Liderança vinculada ao Coordenador Micro (campaign_members, hierarchy_level micro)
             └─ Micro vinculado ao Coordenador Macro (supervisor_id)
                  └─ Macro consolida tudo abaixo

Se a liderança NÃO tem coordenador micro → pontua direto no macro da cidade.
```

**Vínculos usados (já existentes no schema):**
- `actions.created_by` = usuário que registrou (geralmente a liderança/coordenador na ponta)
- `leaders.coordinator_id` → `campaign_members.id` (coordenador responsável)
- `campaign_members.supervisor_id` → coordenador imediatamente acima
- `campaign_members.hierarchy_level` (1 = macro/topo, números maiores = micro/base)
- `campaign_members.macroregion_id` / `microregion` / `municipality`

## Métricas por nível

Cada card/linha de ranking mostra:
- **Soma de impact_score** (volume — premia esforço)
- **Média de impact_score** (eficiência — premia qualidade por ação)
- **Nº de ações** e **nº de lideranças ativas** sob o escopo
- **Pessoas impactadas** (somatório)

Dois rankings paralelos (Volume e Eficiência), igual ao padrão já usado em lideranças.

## Estrutura da página `/produtividade`

```text
┌─ Header: Produtividade · filtro de candidato ativo · período (7/30/90 dias/tudo)
├─ KPIs globais (4 cards): total de ações, score total, score médio, top performer
├─ Tabs:
│   ├─ Macrorregiões      → ranking dos coordenadores macro
│   ├─ Microrregiões      → ranking dos coordenadores micro (drill-down do macro)
│   └─ Lideranças         → ranking individual
└─ Cada linha é clicável → expande para mostrar o nível imediatamente abaixo (drill-down)
```

## Implementação técnica

**1. RPC `get_productivity_ranking(p_candidate_id uuid, p_period_days int)`** (migration)
- Retorna JSON com 3 arrays: `macros`, `micros`, `leaders`, cada um com `{id, name, total_score, avg_score, action_count, leader_count, people_impacted}`.
- CTE base: ações não deletadas, filtradas por candidato + período + `impact_score IS NOT NULL`.
- Resolve a hierarquia: para cada ação, descobre o coordenador da liderança (`leaders.coordinator_id`), sobe via `supervisor_id` até achar o macro (hierarchy_level mínimo). Se não houver micro, atribui direto ao macro pela `macroregion_id` da liderança/ação.
- `SECURITY DEFINER` + check `public.is_admin(auth.uid())` no topo; retorna erro se não for admin master.

**2. Frontend novo:**
- `src/pages/Produtividade.tsx` — página principal com tabs e drill-down
- `src/hooks/useProductivity.ts` — wrapper `useQuery` para a RPC
- Reutiliza `InfographicHBar` e `InfographicDonut` para visual consistente Navy-Teal
- Rota em `App.tsx` protegida por `ProtectedRoute` + check `isAdminMaster`
- Item de menu em `AppSidebar.tsx` visível apenas para admin master

**3. Sem alterações de schema** além da RPC (todas as colunas já existem: `actions.impact_score`, `leaders.coordinator_id`, `campaign_members.supervisor_id/hierarchy_level/macroregion_id`).

## Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/...` | nova RPC `get_productivity_ranking` |
| `src/pages/Produtividade.tsx` | criar |
| `src/hooks/useProductivity.ts` | criar |
| `src/App.tsx` | adicionar rota `/produtividade` |
| `src/components/layout/AppSidebar.tsx` | adicionar item visível só para admin master |

## Pendências / suposições

- Assumo que **liderança vincula a uma ação** via `actions.created_by` casando com `leaders.created_by` do mesmo usuário OU via heurística geográfica (mesma cidade). Se quiser um vínculo explícito (ex.: `actions.leader_id`), preciso adicionar essa coluna — me avise.
- Período padrão = 30 dias; pode ser alterado no filtro.
- Ações sem `impact_score` (legado) são ignoradas no ranking, mas contadas em "total de ações".
