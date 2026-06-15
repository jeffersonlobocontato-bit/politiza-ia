# Plano — Módulo Gestão de Equipe (Kanban + Check-ins)

## Regra de escopo (núcleo da entrega)

Toda query e mutação respeita o **candidato ativo**, exceto admin master, que delega para qualquer equipe.

| Ator | Pode ver | Pode criar/atribuir |
|---|---|---|
| Admin master (Jefferson, Edson, Julio) | Tarefas e check-ins de **todos os candidatos**; filtro por candidato ativo no UI | Cria tarefas em **qualquer** candidato; atribui a qualquer membro de qualquer equipe |
| Usuário vinculado em `user_candidates` | Apenas tarefas/check-ins dos candidatos vinculados | Cria/atribui apenas dentro do candidato ativo (que precisa estar entre os vinculados) |
| Demais autenticados | Nada (RLS bloqueia) | Nada |

Implementação em RLS via helpers já existentes:
- `is_admin(auth.uid())` → bypass total.
- `can_view_candidate_record(auth.uid(), candidate_id)` → restringe por `user_candidates`.

---

## 1. Migration (correções sobre o SQL enviado)

1. **GRANTs obrigatórios** em `tasks` e `daily_checkins` (não vieram no arquivo — sem isso PostgREST nega tudo).
2. **RLS reescrita**:
   - `tasks_select`: `is_admin OR can_view_candidate_record(auth.uid(), candidate_id)`
   - `tasks_insert`: `is_admin OR can_view_candidate_record(...)` no `candidate_id` enviado
   - `tasks_update/delete`: dono, responsável, ou `is_admin`
   - `checkins_select`: `auth.uid() = user_id OR is_admin`
   - `checkins_insert/update`: `auth.uid() = user_id`
3. **Soft-delete** (memória *Data Compliance*): coluna `deleted_at` em `tasks` e `daily_checkins`; queries filtram `IS NULL`; `useDeleteTask` faz update, não DELETE físico.
4. **Trigger `updated_at`** reaproveita `public.update_updated_at_column()` em vez de criar nova função.

## 2. Hooks

`useTasks.ts`:
- Novo parâmetro opcional `candidateIdOverride` para o admin master criar tarefa em outro candidato pelo modal de delegação.
- `useTasks(candidateId)` aceita "Todos" quando admin master quer ver tudo (passa `null`/`'all'`, query não filtra).
- `queryKey` corrigida para `['tasks', candidateId]` (bug do `useUpdateTaskStatus` que invalidava chave errada).
- `useDeleteTask` faz update `{ deleted_at: now() }`.

`useCheckins.ts`: filtros idem; admin master pode ver semana de todos os candidatos.

Novo helper hook `useAssignableTeam(candidateId)`:
- Retorna lista de pessoas (de `campaign_members` + `profiles` vinculados via `user_candidates`) do candidato selecionado para popular o autocomplete "Atribuir a".
- Admin master vê o autocomplete inteiro por candidato; ao trocar o candidato no modal, a lista recarrega.

## 3. Página `Gestao.tsx` — design inspirado nas referências

Pegando o que faz sentido nas 4 imagens (Kanban escuro com pill-headers coloridos, contadores grandes tipo "Bucket Board", "Sprint overview" com Status/Burndown/Workload, cards com avatar + tags), traduzido para os **tokens MobNex** (sem cores cruas):

### Header
- Título com `text-gradient` "Gestão de Equipe", subtítulo com candidato ativo.
- **Seletor de escopo** (visível só p/ admin master): chips `Candidato ativo • Todos os candidatos • <candidato X>` → controla a chave de query.
- Botão `+ Nova Tarefa` (variante primária).

### Faixa de KPIs (estilo "Bucket Board")
Cards quadrados com número grande, ícone e label, mas **usando tokens** (`bg-card border`, accents `primary / chart-1..5`). Métricas: A fazer, Em andamento, Bloqueado, Concluído (hoje), Check-ins do dia, Atrasadas.

### Painel "Sprint overview" (3 cards lado a lado)
- **Status overview**: donut Recharts por status (cores chart tokens).
- **Carga por área**: barras horizontais por `area` (central/regional/partidário).
- **Carga por pessoa**: avatares + grid de status (estilo Team workload da referência), capado em 6 com link "ver tudo".

### Kanban (núcleo)
- 4 colunas com pill-header colorido (`primary`, `chart-2`, `destructive`, `chart-3` em opacidade Navy-Teal) + contador à direita (como `13/17` da ref).
- Card: avatar do responsável, título, badges Área + Prioridade (variantes shadcn, não cores hardcoded), data e checkbox de conclusão rápida.
- Modal de tarefa: campos + **dropdown de candidato (admin master)** + autocomplete de responsável dependente do candidato.
- Drag-and-drop com `@dnd-kit/core` (já no projeto se disponível; senão manter dropdown de status).

### Aba Check-ins
- Form do meu check-in (Entreguei / Vou fazer / Bloqueios) em card lateral.
- Feed dos check-ins de hoje da equipe (lista com avatar + 3 linhas), filtrada pelo escopo.

### Aba Relatório
- Heatmap simples por dia da semana + ranking de check-ins consistentes (últimos 7 dias).

### Regras de design (memórias)
- Zero hex cru. Tudo via `primary`, `secondary`, `accent`, `chart-1..5`, `destructive`, `muted-foreground`.
- DM Sans em tudo (já global).
- Cards `bg-card border border-border`, glow nos ícones de header (`bg-primary/10 ring-1 ring-primary/30`).
- Tema claro/escuro respeitado.

## 4. Integração
- Rota `/gestao` em `src/App.tsx` (ProtectedRoute + RoleAwareLayout).
- Item na sidebar `AppSidebar.tsx` com `LayoutGrid` + `ListTodo`.
- Sem mudança em `types.ts` (regenerado após migration).

## 5. Entregáveis
1. Migration nova (substitui a enviada).
2. `src/hooks/useTasks.ts`, `useCheckins.ts`, `useAssignableTeam.ts`.
3. `src/pages/Gestao.tsx` redesenhada.
4. `src/App.tsx`, `src/components/layout/AppSidebar.tsx` atualizados.

## Perguntas antes de implementar
1. **Drag-and-drop no Kanban**: instalar `@dnd-kit/core` agora ou manter o dropdown de status do arquivo original?
2. **Lista de responsáveis** ao atribuir tarefa: usar somente `campaign_members` do candidato, ou também usuários autenticados vinculados em `user_candidates`?
3. **Check-ins** quando admin master está em modo "Todos os candidatos": somar globalmente ou exigir candidato selecionado?
