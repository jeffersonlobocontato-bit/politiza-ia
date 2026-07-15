// Executa 1x/dia (via pg_cron às 10h UTC = 07h BRT).
// Para cada tarefa não concluída com due_date < hoje e assigned_to != null:
// - cria uma linha em notifications (uma por dia, idempotente)
// - dispara Web Push via send-push
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Autorização: service role (cron) OU chamada autenticada de admin_master
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isService = token === serviceKey;

    if (!isService) {
      const supa = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await supa.auth.getUser();
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { data: isAdmin } = await supa.rpc('is_admin', { _user_id: user.id });
      if (!isAdmin) return json({ error: 'forbidden' }, 403);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey,
      { auth: { persistSession: false } },
    );

    const todayISO = new Date().toISOString().slice(0, 10);

    const { data: overdue, error } = await admin
      .from('tasks')
      .select('id, title, due_date, assigned_to, assigned_name, candidate_id')
      .is('deleted_at', null)
      .neq('status', 'concluido')
      .not('assigned_to', 'is', null)
      .lt('due_date', todayISO);
    if (error) throw error;

    if (!overdue || overdue.length === 0) {
      return json({ ok: true, checked: 0, reminders: 0 });
    }

    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    let created = 0;
    const pushJobs = new Map<string, { title: string; body: string; url: string; tag: string }[]>();

    for (const t of overdue) {
      const dueDate = new Date(t.due_date + 'T00:00:00Z');
      const daysLate = Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / 86400000));

      // idempotência: só cria notification se ainda não houver uma 'task_overdue' hoje
      const { data: existing } = await admin
        .from('notifications')
        .select('id')
        .eq('user_id', t.assigned_to)
        .eq('type', 'task_overdue')
        .eq('report_id', t.id)
        .gte('created_at', startOfDay.toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue;

      const msg = `Tarefa atrasada há ${daysLate} dia${daysLate > 1 ? 's' : ''}: ${t.title}`;
      const link = `/campo/tarefas?task=${t.id}`;

      await admin.from('notifications').insert({
        user_id: t.assigned_to,
        type: 'task_overdue',
        report_id: t.id,
        message: msg,
        link,
      });
      created++;

      if (!pushJobs.has(t.assigned_to)) pushJobs.set(t.assigned_to, []);
      pushJobs.get(t.assigned_to)!.push({
        title: 'Tarefa atrasada',
        body: msg,
        url: link,
        tag: `task-${t.id}`,
      });
    }

    // Dispara web push agregado por usuário
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
    await Promise.allSettled([...pushJobs.entries()].map(async ([userId, jobs]) => {
      // Envia uma notification por tarefa (usuário pode ver várias)
      for (const p of jobs) {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_ids: [userId], payload: p }),
        }).catch((e) => console.error('send-push failed:', e));
      }
    }));

    return json({ ok: true, checked: overdue.length, reminders: created });
  } catch (e) {
    console.error('task-overdue-reminders error:', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
