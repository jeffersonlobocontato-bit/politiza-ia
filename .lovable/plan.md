## Objetivo
Permitir vincular membros da Hierarquia a **múltiplas Associações de Municípios** e **múltiplas Macrorregiões** (mapa político), com regras específicas por nível, e reaproveitar **Perfis de Liderança** como "entidade" para a Liderança Municipal.

## Regras por nível

| Nível | Multi Associações | Multi Macrorregiões | Cidade | Perfis (entidade) |
|---|---|---|---|---|
| 3 — Coord. Macrorregional | ✅ | ✅ | opcional | — |
| 4 — Coord. Microrregional | ✅ | ✅ | opcional | — |
| 5 — Coord. Municipal | ✅ (sugerida pela cidade) | herdada | obrigatória | — |
| 6 — Liderança Local | ✅ (sugerida) | herdada | obrigatória | ✅ multi-select |

Para níveis 1 e 2, os campos novos ficam ocultos (sem mudança).

## Banco de dados (migração)

Três tabelas N:N + reuso da existente:

1. `campaign_member_associations` (member_id, association_id) — FK para `municipality_associations`
2. `campaign_member_macroregions` (member_id, macroregion_id) — FK para `macroregions`
3. `campaign_member_leadership_profiles` (member_id, profile_id) — FK para `leadership_profiles` (mesmo padrão de `leader_leadership_profiles`)

Cada uma com GRANT + RLS (visível a quem vê o membro, editável pelo criador/admin), e índices em `member_id`.

O campo legado `macroregion_id` em `campaign_members` continua existindo para retro-compatibilidade (primário/principal).

## Frontend

**`src/pages/Hierarquia.tsx`** — formulário (modal "Novo/Editar Membro"):
- Quando `hierarchy_level` ∈ {3,4,5,6}, mostrar bloco "Vínculos territoriais":
  - **Associações de Municípios**: chips multi-select (componente similar a `LeadershipProfileSelect`)
  - **Macrorregiões**: chips multi-select
- Quando nível = 6: mostrar também **Perfis de Liderança** (multi-select já existente `LeadershipProfileSelect`)
- Auto-sugestão: ao escolher cidade via `GeoLocationInput`, pré-selecionar a Associação correspondente (via `useAssociationForCity`) e a Macrorregião do município (lookup em `municipalities`) — usuário pode editar.
- Submit: após salvar/atualizar o membro principal, fazer `delete + insert` nas 3 tabelas-ponte (padrão usado em `useSetLeaderProfiles`).

**Novos hooks** em `src/hooks/useCampaignMemberLinks.ts`:
- `useMemberAssociations(memberId)`, `useSetMemberAssociations()`
- `useMemberMacroregions(memberId)`, `useSetMemberMacroregions()`
- `useMemberLeadershipProfiles(memberId)`, `useSetMemberLeadershipProfiles()`

**Componente** `src/components/hierarquia/MultiChipSelect.tsx`: select com chips reutilizável (Associações e Macrorregiões), seguindo visual de `LeadershipProfileSelect`.

**Exibição** nos cards de membro da listagem: mostrar badges das associações/macrorregiões/perfis vinculados (compacto, abaixo do cargo).

## Fora do escopo
- Mudanças no fluxograma, dashboard, charts, ou em outras páginas.
- Migração retroativa de dados existentes (registros antigos seguem com `macroregion_id` único; usuário pode editar para adicionar mais).