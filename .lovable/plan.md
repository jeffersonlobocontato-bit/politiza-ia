
# Nova métrica de Eficiência por nível hierárquico

Substituir o modo "Eficiência" (hoje média de `impact_score`) por um Score de Eficiência 0–100 calculado de forma diferente por nível, com deadline fixo do 1º turno em **04/10/2026**.

## Fórmula geral (0–100)

Para cada pessoa avaliada:

```
Eficiência = 0,50 × Ações + 0,30 × Velocidade + 0,20 × CadastrosAtivos
```

- **Ações (0–100)**: normaliza o total de ações de campo executadas pelos liderados abaixo dele (recursivo), contra o topo do próprio nível no período.
- **Cadastros Ativos (0–100)**: normaliza a quantidade de subordinados diretos "ativos" contra o topo do próprio nível. "Ativo" = `status = 'ativo'` **E** ao menos 1 ação de campo registrada.
- **Velocidade (0–100)**: mede antecipação em relação a 04/10/2026. Para cada cadastro ativo direto, `dias_de_antecedência = deadline - data_de_ativação` (data da 1ª ação). Score = média(dias_antecedência) / (deadline − data_referência_do_projeto) × 100, saturado em 100.

## O que muda por nível

| Nível | Cadastros diretos considerados | Ações consideradas |
|---|---|---|
| Macrorregional (nível 3) | Coord. microrregionais ativos abaixo | Todas as ações da sub-árvore |
| Microrregional/Municipal (nível 5) | Coord. municipais / lideranças ativas abaixo | Ações da sub-árvore |
| Liderança municipal | — (só ações) | Ações próprias |

Para liderança: `Eficiência = 100% Ações` (não há cadastros).

## Backend

Reescrever `public.get_productivity_ranking(p_candidate_id, p_period_days)` para retornar, além dos campos atuais, por linha:

- `actions_score` (0–100)
- `speed_score` (0–100)
- `active_score` (0–100)
- `efficiency_score` (0–100) — composto conforme fórmula
- `active_count`, `avg_lead_days`

Constantes: `DEADLINE = 2026-10-04`, `PROJECT_START = 2026-01-01` (base de normalização da velocidade).

## Frontend

`src/hooks/useProductivity.ts`: adicionar os novos campos ao tipo `ProductivityRow`.

`src/pages/Produtividade.tsx`:
- Toggle passa a ser **Volume** (score total, como hoje) × **Eficiência** (novo `efficiency_score`).
- No modo Eficiência, cada card mostra o valor 0–100 + mini-breakdown `Ações / Velocidade / Ativos` e um `Badge` "Ativos: N · Antecedência média: X dias".
- Barra de progresso passa a usar `efficiency_score` no modo Eficiência.

Nada muda para admins que não olham essa aba; não altera schema de tabelas.

## Detalhes técnicos

- Ativação de um subordinado = `MIN(created_at)` da tabela `actions` filtrada por `created_by = subordinado.user_id` (fallback: `campaign_members.created_at` se nunca agiu → não conta como ativo).
- Recursão pela sub-árvore reaproveita a lógica já existente em `get_subtree_user_ids` / joins de `campaign_members.supervisor_id`.
- Normalização: divide pelo topo do nível no conjunto retornado; se topo = 0, score = 0.
- Segurança: mantém `SECURITY DEFINER` + checagem `is_admin(auth.uid())`.
