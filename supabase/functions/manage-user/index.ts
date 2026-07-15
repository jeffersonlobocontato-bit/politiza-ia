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
    const isMicro = callerRoleSet.has("coordenador_microrregional");
    const isMunicipal = callerRoleSet.has("coordenador_municipal");
    if (!isAdminFull && !isEstadual && !isRegional && !isMicro && !isMunicipal)
      return json({ error: "Apenas coordenadores podem gerenciar membros da equipe" }, 403);

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
    const MICRO_ALLOWED_ROLES = new Set([
      "coordenador_municipal",
      "operador_campo",
      "lideranca_local",
    ]);
    const MUNICIPAL_ALLOWED_ROLES = new Set([
      "operador_campo",
      "lideranca_local",
    ]);

    const allowedSet = isAdminFull
      ? null
      : isEstadual
        ? ESTADUAL_ALLOWED_ROLES
        : isRegional
          ? REGIONAL_ALLOWED_ROLES
          : isMicro
            ? MICRO_ALLOWED_ROLES
            : MUNICIPAL_ALLOWED_ROLES;

    // Mapeamento role → hierarquia (aba Hierarquia).
    // Mantém compatibilidade com dados existentes (Regional=3, Municipal=5).
    const HIERARCHY_MAP: Record<string, { level: number; label: string }> = {
      coordenador_regional:       { level: 3, label: "Coordenador Regional" },
      coordenador_microrregional: { level: 4, label: "Coordenador Microrregional" },
      coordenador_municipal:      { level: 5, label: "Coordenador Municipal" },
      lideranca_local:            { level: 6, label: "Liderança Local" },
    };

    const syncCampaignMember = async (
      target_user_id: string,
      role: string,
      profile: { full_name?: string; email?: string; phone?: string | null },
      scope: { macroregion_id?: string | null; microregion?: string | null; municipality?: string | null },
      candidate_ids?: string[],
    ) => {
      const map = HIERARCHY_MAP[role];
      // Remove entradas antigas caso o role não seja hierárquico (evita órfãos após update_role).
      if (!map) {
        await admin.from("campaign_members").delete().eq("user_id", target_user_id);
        return;
      }

      // Descobre supervisor: o campaign_member do usuário logado (quem cadastra).
      let supervisor_id: string | null = null;
      const { data: sup } = await admin
        .from("campaign_members")
        .select("id, hierarchy_level")
        .eq("user_id", user.id)
        .order("hierarchy_level", { ascending: true })
        .maybeSingle();
      if (sup?.id && (sup.hierarchy_level ?? 99) < map.level) supervisor_id = sup.id;

      const candidate_id = Array.isArray(candidate_ids) && candidate_ids.length > 0 ? candidate_ids[0] : null;

      // Upsert por user_id.
      const { data: existing } = await admin
        .from("campaign_members")
        .select("id")
        .eq("user_id", target_user_id)
        .maybeSingle();

      const payloadCm: any = {
        user_id: target_user_id,
        name: profile.full_name || "",
        email: profile.email || null,
        phone: profile.phone || null,
        role: map.label,
        hierarchy_level: map.level,
        macroregion_id: scope.macroregion_id || null,
        microregion: scope.microregion || null,
        municipality: scope.municipality || null,
        supervisor_id,
        candidate_id,
        status: "ativo",
      };
      if (existing?.id) {
        await admin.from("campaign_members").update(payloadCm).eq("id", existing.id);
      } else {
        await admin.from("campaign_members").insert({ ...payloadCm, created_by: user.id });
      }
    };

    const assertCanManageRole = (role: string | null | undefined): string | null => {
      if (isAdminFull) return null;
      if (!role || !allowedSet!.has(role)) {
        if (isEstadual) return "Coordenador Estadual só pode gerenciar membros N3, N4, N5, Operador de Campo ou Liderança Local";
        if (isRegional) return "Coordenador Regional só pode gerenciar membros N4, N5, Operador de Campo ou Liderança Local";
        if (isMicro) return "Coordenador Microrregional só pode gerenciar membros N5, Operador de Campo ou Liderança Local";
        return "Coordenador Municipal só pode gerenciar Operador de Campo ou Liderança Local";
      }
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
      const { email, password, full_name, phone, referred_by, role, macroregion_id, microregion, municipality, coordinated_municipalities, candidate_ids } = payload;
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
        coordinated_municipalities: Array.isArray(coordinated_municipalities) ? coordinated_municipalities : [],
      });
      if (roleErr) return json({ error: roleErr.message }, 400);

      if (Array.isArray(candidate_ids) && candidate_ids.length > 0) {
        await admin.from("user_candidates").insert(
          candidate_ids.map((cid: string) => ({ user_id: userId, candidate_id: cid, created_by: user.id }))
        );
      }

      await syncCampaignMember(
        userId,
        role,
        { full_name, email, phone },
        { macroregion_id, microregion, municipality },
        Array.isArray(candidate_ids) ? candidate_ids : [],
      );

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
      const { user_id, role, macroregion_id, microregion, municipality, coordinated_municipalities } = payload;
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
        coordinated_municipalities: Array.isArray(coordinated_municipalities) ? coordinated_municipalities : [],
      });
      if (error) return json({ error: error.message }, 400);

      // Busca perfil e vínculos para sincronizar hierarquia.
      const { data: prof } = await admin.from("profiles").select("full_name, email, phone").eq("id", user_id).maybeSingle();
      const { data: linksRows } = await admin.from("user_candidates").select("candidate_id").eq("user_id", user_id);
      const linkedIds = (linksRows ?? []).map((r: any) => r.candidate_id);
      await syncCampaignMember(
        user_id,
        role,
        { full_name: (prof as any)?.full_name, email: (prof as any)?.email, phone: (prof as any)?.phone },
        { macroregion_id, microregion, municipality },
        linkedIds,
      );

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

      // Reflete alterações de nome/telefone no cadastro da hierarquia.
      await admin.from("campaign_members")
        .update({ name: full_name, phone: phone || null })
        .eq("user_id", user_id);

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
      // Remove o vínculo hierárquico antes de excluir o auth user.
      await admin.from("campaign_members").delete().eq("user_id", user_id);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
