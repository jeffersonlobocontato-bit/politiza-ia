// One-off: fix camilo email + reset password. Self-contained.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const USER_ID = "f9869481-3876-4299-839c-9024f1b58b3e";
const NEW_EMAIL = "camiloindustrial@hotmail.com";
const NEW_PASSWORD = "Politiza@2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await admin.auth.admin.updateUserById(USER_ID, {
    email: NEW_EMAIL,
    email_confirm: true,
    password: NEW_PASSWORD,
    user_metadata: { must_change_password: true, full_name: "Joneval Verci Camilo" },
  });
  if (error) return json({ error: error.message }, 400);

  await admin.from("profiles").update({ email: NEW_EMAIL }).eq("id", USER_ID);

  return json({ ok: true, id: data.user?.id, email: data.user?.email });
});
