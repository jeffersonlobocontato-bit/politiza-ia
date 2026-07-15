import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const action = body?.action ?? 'subscribe';

    if (action === 'unsubscribe') {
      const endpoint = String(body?.endpoint ?? '');
      if (!endpoint) return json({ error: 'endpoint required' }, 400);
      const admin = adminClient();
      await admin.from('push_subscriptions').delete()
        .eq('user_id', user.id).eq('endpoint', endpoint);
      return json({ ok: true });
    }

    // subscribe
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return json({ error: 'invalid subscription payload' }, 400);
    }

    const admin = adminClient();
    const row = {
      user_id: user.id,
      endpoint: String(sub.endpoint),
      p256dh: String(sub.keys.p256dh),
      auth: String(sub.keys.auth),
      user_agent: req.headers.get('user-agent') ?? null,
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });
    if (error) throw error;

    return json({ ok: true });
  } catch (e) {
    console.error('register-push-subscription error:', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
