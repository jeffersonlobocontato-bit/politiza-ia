// One-off: reset senha para lista de usuários. Self-contained.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const TARGETS = [
  "juarez@politiza.ia.br",
  "daniela@politiza.ia.br",
];
const NEW_PASSWORD = "Politiza#Campo2026!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: any[] = [];

  for (const email of TARGETS) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) { results.push({ email, error: listErr.message }); continue; }
    const u = list.users.find(x => (x.email || "").toLowerCase() === email.toLowerCase());
    if (!u) { results.push({ email, error: "not_found" }); continue; }
    const { error } = await admin.auth.admin.updateUserById(u.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(u.user_metadata || {}), must_change_password: true },
    });
    results.push({ email, id: u.id, ok: !error, error: error?.message });
  }

  return json({ ok: true, results });
});
