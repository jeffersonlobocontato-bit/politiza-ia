// One-off admin ops protected by BOOTSTRAP_TOKEN.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("BOOTSTRAP_TOKEN");
  if (!expected || secret !== expected) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { user_id, new_email, new_password } = await req.json();
  if (!user_id) return json({ error: "user_id required" }, 400);

  const patch: any = {};
  if (new_email) { patch.email = new_email; patch.email_confirm = true; }
  if (new_password) { patch.password = new_password; patch.user_metadata = { must_change_password: true }; }

  const { data, error } = await admin.auth.admin.updateUserById(user_id, patch);
  if (error) return json({ error: error.message }, 400);

  if (new_email) {
    await admin.from("profiles").update({ email: new_email }).eq("id", user_id);
  }

  return json({ ok: true, user: { id: data.user?.id, email: data.user?.email } });
});
