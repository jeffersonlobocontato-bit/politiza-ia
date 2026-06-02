import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await caller.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Apenas administradores podem gerenciar usuários" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, full_name, phone, role, macroregion_id, microregion, municipality, candidate_ids } = payload;
      if (!email || !password || !full_name || !role)
        return json({ error: "Campos obrigatórios: email, senha, nome e nível de acesso" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const userId = created.user.id;
      await admin.from("profiles").upsert({ id: userId, full_name, email, phone: phone || null });
      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: userId,
        role,
        macroregion_id: macroregion_id || null,
        microregion: microregion || null,
        municipality: municipality || null,
      });
      if (roleErr) return json({ error: roleErr.message }, 400);

      if (Array.isArray(candidate_ids) && candidate_ids.length > 0) {
        await admin.from("user_candidates").insert(
          candidate_ids.map((cid: string) => ({ user_id: userId, candidate_id: cid, created_by: user.id }))
        );
      }

      return json({ user_id: userId });
    }

    if (action === "set_candidates") {
      const { user_id, candidate_ids } = payload;
      if (!user_id || !Array.isArray(candidate_ids))
        return json({ error: "user_id e candidate_ids (array) obrigatórios" }, 400);

      await admin.from("user_candidates").delete().eq("user_id", user_id);
      if (candidate_ids.length > 0) {
        const { error } = await admin.from("user_candidates").insert(
          candidate_ids.map((cid: string) => ({ user_id, candidate_id: cid, created_by: user.id }))
        );
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    if (action === "update_role") {
      const { user_id, role, macroregion_id, microregion, municipality } = payload;
      if (!user_id || !role) return json({ error: "user_id e role obrigatórios" }, 400);

      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await admin.from("user_roles").insert({
        user_id, role,
        macroregion_id: macroregion_id || null,
        microregion: microregion || null,
        municipality: municipality || null,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "update_profile") {
      const { user_id, full_name, phone } = payload;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      const { error } = await admin.from("profiles").update({
        full_name, phone: phone || null,
      }).eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = payload;
      if (!user_id || !password) return json({ error: "user_id e senha obrigatórios" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = payload;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      if (user_id === user.id) return json({ error: "Você não pode excluir o próprio usuário" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
