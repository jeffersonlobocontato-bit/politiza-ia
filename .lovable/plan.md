# Sino de Tarefas + Web Push Diário no App de Campo

## 1. Atribuição de tarefas por membro

**Painel de gestores (`TasksManager` / criação de tarefa):**
- Substituir/complementar campo `assigned_to` por dropdown "Atribuir a" carregando membros da equipe (`campaign_members` + `profiles`) do candidato ativo.
- Salvar `assigned_to` (uuid do profile do membro) e `assigned_name` na tabela `tasks` (colunas já existem).

## 2. Notificações in-app (sino)

**Backend:**
- Trigger `AFTER INSERT` em `public.tasks`: se `assigned_to` for diferente do criador, insere linha em `public.notifications` com `type='task_assignment'`, mensagem "Nova tarefa: <título>", `link='/campo/tarefas?task=<id>'`.
- Trigger `AFTER UPDATE OF assigned_to`: notifica novo responsável quando a atribuição muda.

**Frontend (app de campo):**
- Adicionar `NotificationBell` (já existe) ao header do `CampoLayout`.
- Reaproveitar realtime channel existente para toast + badge de não lidas.

## 3. Painel de tarefas do membro no app de campo

Nova rota `/campo/tarefas` (link no `CampoDashboard`):
- Lista tarefas onde `assigned_to = auth.uid()`, agrupadas por status (A fazer / Em andamento / Bloqueado / Concluído).
- Cada card exibe: título, prazo (`due_date`), badge de status, badge de **atraso** ("Atrasada há X dias") calculado em relação a `due_date` quando status ≠ `concluido` e `due_date < hoje`.
- Ações rápidas: marcar em andamento / concluído (usa `useUpdateTaskStatus`).
- Abre detalhe (sheet) com descrição, prioridade, área, criador.

## 4. Lembrete diário 7h (America/Sao_Paulo) — tarefas atrasadas

**Edge function `task-overdue-reminders`:**
- Busca tarefas com `deleted_at IS NULL`, `status <> 'concluido'`, `assigned_to IS NOT NULL`, `due_date < CURRENT_DATE`.
- Para cada uma:
  - Insere linha em `notifications` (`type='task_overdue'`, mensagem "Tarefa atrasada há N dias: <título>").
  - Envia Web Push para todas as subscriptions do usuário (ver §5).
- Idempotência: só cria notification do dia se ainda não existir para (`user_id`, `task_id`, `date_trunc('day', now())`).

**Cron (pg_cron + pg_net):** dispara a function todo dia às `10:00 UTC` (= 07:00 BRT).

## 5. Web Push (PWA)

**Infra:**
- Ativar PWA manifest-only já existente + registrar service worker dedicado `public/push-sw.js` (só push, sem app-shell cache — respeita a skill PWA).
- Gerar par VAPID e salvar `VAPID_PUBLIC_KEY` (env pública via `set_secret` + expor pelo edge) e `VAPID_PRIVATE_KEY` (`generate_secret`).
- Nova tabela `push_subscriptions` (user_id, endpoint unique, p256dh, auth, user_agent, created_at) com RLS: usuário só vê/gerencia as próprias.

**Frontend:**
- Ao logar no app de campo, pedir permissão de notificação (banner discreto no `CampoDashboard`), registrar subscription e persistir via edge `register-push-subscription`.
- Botão "Ativar notificações" nas configurações do campo caso o usuário negue.

**Edge function `send-push`:** helper usado por `task-overdue-reminders` e pelo trigger de nova tarefa (via `pg_net` → função) para enviar payload `{title, body, url}` a todas as subscriptions do destinatário, removendo endpoints 404/410.

## 6. UI – indicadores de atraso no painel do gestor

- No `TasksManager` existente, adicionar chip vermelho "Atrasada Xd" ao lado do prazo quando aplicável, para paridade visual com o app de campo.

---

## Detalhes técnicos

**Novos arquivos:**
- `supabase/functions/task-overdue-reminders/index.ts`
- `supabase/functions/register-push-subscription/index.ts`
- `supabase/functions/send-push/index.ts` (helper reutilizável)
- `public/push-sw.js`
- `src/pages/CampoTarefas.tsx`
- `src/components/campo/TaskCard.tsx`
- `src/hooks/usePushSubscription.ts`
- `src/lib/taskOverdue.ts` (`getOverdueDays(dueDate, status)`)

**Alterados:**
- `src/components/layout/CampoLayout.tsx` — adiciona sino.
- `src/pages/CampoDashboard.tsx` — card "Minhas Tarefas" + prompt de permissão.
- `src/App.tsx` — rota `/campo/tarefas`.
- Componente de criação de tarefa do gestor — dropdown de atribuição.
- `public/manifest.webmanifest` — verificar `gcm_sender_id`/`scope` se preciso.

**Migrations:**
1. `push_subscriptions` (tabela + RLS + GRANTs).
2. Triggers em `tasks` para notificação de atribuição.
3. Índice em `tasks(assigned_to, status, due_date)` para o cron.
4. `pg_cron` job diário 10:00 UTC chamando `task-overdue-reminders` via `pg_net`.

**Secrets a solicitar/gerar:**
- `VAPID_PUBLIC_KEY` (set_secret com valor gerado localmente pelo agent — publicável) e cópia em `.env` como `VITE_VAPID_PUBLIC_KEY`.
- `VAPID_PRIVATE_KEY` (generate_secret / server-only).
- `VAPID_SUBJECT` = `mailto:contato@politiza.ia.br` (set_secret).

**Observação iOS:** Web Push no iOS só funciona com o PWA instalado na tela de início (iOS 16.4+). O sino in-app e a lista de tarefas com badge de atraso garantem o alerta mesmo sem push nativo.
