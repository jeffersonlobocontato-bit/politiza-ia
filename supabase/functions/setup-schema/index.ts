import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: admin only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(url, anon);
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: isAdmin } = await admin.rpc("is_admin" as any, { _user_id: claimsData.claims.sub });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // We'll use the postgres extension to run arbitrary SQL
  const schema = `
    DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin_master','coordenador_geral','coordenador_estadual','coordenador_regional','coordenador_microrregional','coordenador_municipal','lideranca_local','operador_campo','analista_inteligencia','analista_pesquisa','executivo_leitura'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.action_status AS ENUM ('prevista','confirmada','em_andamento','realizada','atrasada','cancelada','pendente_validacao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.priority_level AS ENUM ('critica','alta','media','baixa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.alignment_status AS ENUM ('alinhado','provavel','neutro','oposicao','indefinido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.asset_type AS ENUM ('prefeito','ex_prefeito','pretenso_prefeito','vereador','ex_vereador','pretenso_vereador','lideranca_comunitaria','lideranca_empresarial','lideranca_religiosa','presidente_entidade','influenciador_regional','coordenador_partidario'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.alert_level AS ENUM ('critico','atencao','oportunidade','info'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.alert_status AS ENUM ('novo','em_analise','resolvido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE public.action_type AS ENUM ('reuniao_politica','visita_institucional','mobilizacao_comunitaria','adesivacao','panfletagem','carreata','evento_regional','agenda_candidato','reuniao_empresarios','encontro_liderancas','acao_digital'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  try {
    const { data, error } = await admin.rpc("exec_sql_admin" as any, { sql: schema });
    return new Response(JSON.stringify({ ok: !error, error, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
