## Objetivo

No modal **Nova Tarefa**, substituir a lista atual de membros da campanha por uma lista hierárquica: cada gestor só vê (e delega para) seus subordinados na cadeia de comando. Admin master continua podendo delegar para qualquer pessoa de qualquer candidato.

## Regra de delegação

- Cada `campaign_members` tem `supervisor_id` (FK auto-referente) e `hierarchy_level` (1–6).
- Um usuário autenticado está ligado a um `campaign_members` via `user_id`.
- **Delegação permitida**: o gestor pode atribuir tarefas a qualquer membro **abaixo dele na árvore** (subordinados diretos + indiretos via `supervisor_id` recursivo), dentro do mesmo `candidate_id`.
- **Admin master** (Jefferson, Edson, Julio): vê toda a árvore de todos os candidatos; pode escolher o candidato e depois o subordinado.
- Usuário sem registro em `campaign_members` (ex.: só vinculado via `user_candidates`) só pode delegar se for admin master; caso contrário o botão "Nova Tarefa" fica desabilitado com tooltip explicando.

## Mudanças

### 1. Banco — função SQL (migration)

`public.get_delegable_members(_user_id uuid, _candidate_id uuid)` retorna `setof campaign_members`:
- Se `is_admin(_user_id)` → retorna todos os membros do candidato (excluindo soft-deleted).
- Senão, localiza o(s) `campaign_members.id` do usuário no candidato e devolve a subárvore via CTE recursiva em `supervisor_id`, excluindo o próprio gestor.

Inclui `GRANT EXECUTE ... TO authenticated`.

### 2. Hook — `src/hooks/useAssignableTeam.ts`

Reescrever para chamar `supabase.rpc('get_delegable_members', { _user_id, _candidate_id })`. Retorna `TeamMember[]` com campo extra `hierarchy_level` e `supervisor_id` para permitir agrupar a UI por nível.

Adicionar hook auxiliar `useMyCampaignMember(candidateId)` que devolve o registro do usuário logado naquele candidato (usado para exibir "Você delega como: <nome> – <cargo>" no modal e para desabilitar o botão quando o usuário não tem posição hierárquica).

### 3. UI — `src/pages/Gestao.tsx` (modal "Nova Tarefa")

- Mostrar bloco informativo no topo do modal: "Delegando como **<nome>** · Nível <n> – <cargo>" (ou "Admin Master · pode delegar para qualquer equipe").
- Campo "Atribuir a" passa a ser um Select agrupado por nível hierárquico, exibindo `nome – cargo (Nível N · município)`.
- Lista vazia → mensagem "Você não possui subordinados cadastrados para delegar".
- Admin master: mantém o seletor de candidato; ao trocar candidato, recarrega a lista.
- Botão "Nova Tarefa" desabilitado (com tooltip) quando usuário não-admin não tem registro de `campaign_members` no candidato ativo OU quando não há subordinados.

### 4. Sem mudanças em RLS de `tasks`

A regra de quem pode **visualizar** tarefas continua a mesma (escopo por candidato + admin master). Só restringimos quem aparece como **assignee** no formulário.

## Itens técnicos

- A CTE recursiva deve ter `WHERE deleted_at IS NULL` (se a coluna existir em `campaign_members` — caso contrário, omitir).
- A função é `STABLE SECURITY DEFINER SET search_path = public`.
- Não altera `useTasks.ts` — `assignee_id` continua sendo o `campaign_members.id` escolhido.
- Pergunta em aberto: **subordinados diretos somente** ou **subárvore completa**? Proponho subárvore completa (gestor pode pular níveis quando necessário); se preferir só diretos, basta remover a recursão.
