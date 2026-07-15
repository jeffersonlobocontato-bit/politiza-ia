// Envia Web Push (VAPID) para todas as inscrições dos user_ids fornecidos.
// Chamado internamente por outras edge functions (protegido por SERVICE_ROLE).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@politiza.ia.br';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

const extraCors = {
  ...corsHeaders,
  'Access-Control-Allow-Headers':
    (corsHeaders as any)['Access-Control-Allow-Headers'] + ', x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: extraCors });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // Autorização: service role OU cron secret armazenado no DB
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let authorized = token && token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!authorized) {
      const cronHeader = req.headers.get('x-cron-secret') ?? '';
      if (cronHeader) {
        const { data } = await admin
          .from('internal_cron_secrets')
          .select('secret')
          .eq('name', 'task-overdue-reminders')
          .maybeSingle();
        if (data?.secret && data.secret === cronHeader) authorized = true;
      }
    }
    if (!authorized) return json({ error: 'forbidden' }, 403);


    const { user_ids, payload } = await req.json() as {
      user_ids: string[]; payload: PushPayload;
    };
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return json({ error: 'user_ids required' }, 400);
    }
    if (!payload?.title || !payload?.body) {
      return json({ error: 'payload.title/body required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', user_ids);
    if (error) throw error;

    const results = await Promise.allSettled((subs ?? []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 6 },
        );
        return { id: s.id, ok: true };
      } catch (err: any) {
        const status = err?.statusCode ?? 0;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
        return { id: s.id, ok: false, status, message: String(err?.message ?? err) };
      }
    }));

    const summary = {
      total: subs?.length ?? 0,
      sent: results.filter(r => r.status === 'fulfilled' && (r as any).value.ok).length,
      failed: results.filter(r => r.status === 'fulfilled' && !(r as any).value.ok).length,
    };
    return json({ ok: true, ...summary });
  } catch (e) {
    console.error('send-push error:', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
