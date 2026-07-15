
# Meus Cadastros — gestão hierárquica de subárvore

Objetivo: cada usuário passa a ter uma aba única onde vê e gerencia tudo que ele e seus subordinados (diretos e indiretos) cadastraram — ativos políticos, lideranças, ações de campo e membros da equipe — com edição total, tanto no desktop quanto no app Campo.

## 1. Backend — função de subárvore reutilizável

Nova função SQL `get_subtree_user_ids(_user_id uuid, _candidate_id uuid)` (SECURITY DEFINER) que retorna o array de `auth.uid()` correspondente ao usuário logado + todos os subordinados via `campaign_members.supervisor_id` (recursiva), resolvendo os `user_id` de cada nó. Admin master recebe todos os usuários do candidato.

Base para todas as consultas do módulo; complementa a `get_delegable_members` já existente (que hoje retorna `campaign_members`, não `auth.users`).

## 2. Ajustes de RLS (edição total na subárvore)

Adicionar policies `UPDATE`/`DELETE` em:
- `political_assets`
- `leaders`
- `actions`
- `campaign_members` e `user_roles` (para gerenciar membros)

Regra: `created_by = auth.uid()` **OU** `created_by = ANY(get_subtree_user_ids(auth.uid(), candidate_id))` **OU** `is_admin(auth.uid())`.

SELECT já existe para admin/criador/party; adicionamos leitura por subárvore usando a mesma função.

## 3. Hook único de dados

`src/hooks/useMyScope.ts` expõe:
- `subtreeUserIds` (via RPC nova)
- `assets`, `leaders`, `actions`, `members` filtrados por `created_by IN subtreeUserIds` e candidato ativo
- KPIs agregados: total por entidade, novos nos últimos 7/30 dias, top 5 subordinados por volume

Usa TanStack Query + `fetchAllRows` para paginação.

## 4. Desktop — nova rota `/meus-cadastros`

Página `src/pages/MeusCadastros.tsx` na sidebar (ícone `FolderKanban`, entre "Campo" e "Produtividade"), visível para qualquer usuário autenticado exceto perfis restritos (Cruzamento Moro / gestor_operacional já filtrados pelo RoleAwareLayout).

Layout:
- Header com big numbers (Ativos, Lideranças, Ações, Membros, Novos na semana)
- Tabs: **Ativos políticos** · **Lideranças** · **Ações** · **Membros da equipe**
- Cada tab: tabela com busca, filtro por subordinado (autor), badge do autor, ações inline **Editar** e **Excluir** (soft-delete quando existir)
- Editor reaproveita os dialogs já existentes (`AssetProfileSheet`, `LeaderFormDialog`, `UsersManager`) abertos em modo edição

## 5. App Campo — nova aba `/campo/meus-cadastros`

Adiciona 5º item no bottom nav do `CampoLayout` (ícone `FolderKanban`, label "Meus"). Página mobile-first `src/pages/CampoMeusCadastros.tsx`:
- Cards de big numbers no topo (2×2 grid)
- Segmented control com as 4 entidades
- Lista scrollable com card por item, swipe/tap → sheet de edição
- Reaproveita formulários mobile já existentes de `CampoLiderancaForm`, `CampoAcao`, `CampoMembros`

Substitui os CTAs redundantes de "Membros" e "Produtividade" que já existem em `Campo.tsx` — passam a viver dentro do painel.

## 6. Exclusão

Soft-delete onde a coluna `deleted_at` já existe (actions, leaders, political_assets, campaign_members). Para `user_roles` sem soft-delete, edge function `manage-user` já suporta remoção — reutilizamos.

## Detalhes técnicos

```text
RPC get_subtree_user_ids
  └─ recursive CTE em campaign_members via supervisor_id
     └─ SELECT DISTINCT user_id WHERE user_id IS NOT NULL

useMyScope(candidateId)
  ├─ subtreeUserIds  (RPC, staleTime 60s)
  ├─ useQuery assets   .in('created_by', subtreeUserIds)
  ├─ useQuery leaders  .in('created_by', subtreeUserIds)
  ├─ useQuery actions  .in('created_by', subtreeUserIds)
  └─ useQuery members  (RPC get_delegable_members, já existe)

Rotas
  Desktop: /meus-cadastros           → MeusCadastros.tsx
  Campo:   /campo/meus-cadastros     → CampoMeusCadastros.tsx
```

RLS de UPDATE/DELETE usa a mesma função SECURITY DEFINER, evitando recursão. Grants mantidos como já estão (`authenticated` + `service_role`).

## Fora do escopo

- Não altera o modelo de dados existente (nenhuma coluna nova).
- Não mexe em permissões de outros módulos.
- Não cria relatórios/exports (podemos adicionar depois se quiser).
