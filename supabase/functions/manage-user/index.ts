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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await caller.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const user = { id: claimsData.claims.sub as string };

    const admin0 = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: callerRoles } = await admin0.from("user_roles").select("role").eq("user_id", user.id);
    const callerRoleSet = new Set((callerRoles ?? []).map((r: any) => r.role));
    const isAdminFull = ["admin_master", "coordenador_geral"].some(r => callerRoleSet.has(r));
    const isEstadual = callerRoleSet.has("coordenador_estadual");
    const isRegional = callerRoleSet.has("coordenador_regional");
    if (!isAdminFull && !isEstadual && !isRegional)
      return json({ error: "Apenas administradores podem gerenciar usuários" }, 403);

    const ESTADUAL_ALLOWED_ROLES = new Set([
      "coordenador_regional",
      "coordenador_microrregional",
      "coordenador_municipal",
      "operador_campo",
      "lideranca_local",
    ]);
    const REGIONAL_ALLOWED_ROLES = new Set([
      "coordenador_microrregional",
      "coordenador_municipal",
      "operador_campo",
      "lideranca_local",
    ]);

    const allowedSet = isAdminFull
      ? null
      : isEstadual
        ? ESTADUAL_ALLOWED_ROLES
        : REGIONAL_ALLOWED_ROLES;

    const assertCanManageRole = (role: string | null | undefined): string | null => {
      if (isAdminFull) return null;
      if (!role || !allowedSet!.has(role))
        return isEstadual
          ? "Coordenador Estadual só pode gerenciar usuários N3, N4, N5, Operador de Campo ou Liderança Local"
          : "Coordenador Regional só pode gerenciar usuários N4, N5, Operador de Campo ou Liderança Local";
      return null;
    };


    const assertCanManageTargetUser = async (target_user_id: string): Promise<string | null> => {
      if (isAdminFull) return null;
      const { data } = await admin0.from("user_roles").select("role").eq("user_id", target_user_id).maybeSingle();
      const targetRole = (data as any)?.role as string | undefined;
      return assertCanManageRole(targetRole);
    };


    const admin = createClient(SUPABASE_URL, SERVICE);
    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, full_name, phone, role, macroregion_id, microregion, municipality, candidate_ids } = payload;
      if (!email || !password || !full_name || !role)
        return json({ error: "Campos obrigatórios: email, senha, nome e nível de acesso" }, 400);
      const roleErrMsg = assertCanManageRole(role);
      if (roleErrMsg) return json({ error: roleErrMsg }, 403);


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
      const tErr0 = await assertCanManageTargetUser(user_id);
      if (tErr0) return json({ error: tErr0 }, 403);

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
      const newRoleErr = assertCanManageRole(role);
      if (newRoleErr) return json({ error: newRoleErr }, 403);
      const targetErr = await assertCanManageTargetUser(user_id);
      if (targetErr) return json({ error: targetErr }, 403);

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
      const tErr1 = await assertCanManageTargetUser(user_id);
      if (tErr1) return json({ error: tErr1 }, 403);
      const { error } = await admin.from("profiles").update({
        full_name, phone: phone || null,
      }).eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = payload;
      if (!user_id || !password) return json({ error: "user_id e senha obrigatórios" }, 400);
      const tErr2 = await assertCanManageTargetUser(user_id);
      if (tErr2) return json({ error: tErr2 }, 403);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = payload;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      if (user_id === user.id) return json({ error: "Você não pode excluir o próprio usuário" }, 400);
      const tErr3 = await assertCanManageTargetUser(user_id);
      if (tErr3) return json({ error: tErr3 }, 403);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
