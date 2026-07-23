// Edge Function: redator-gazeta-chat v1.0
// Agente de IA redator com competências editoriais estilo Gazeta do Povo.
// Cruza dados internos da plataforma (emendas, ativos políticos, ações,
// pesquisas) com web_search para gerar conteúdo persuasivo.
//
// Acesso: EXCLUSIVO via grant em `redator_gazeta_access` — sem bypass por
// role/admin_master. Requer sessão Supabase válida (verify_jwt=true).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  Deno.env.get("APP_ORIGIN") ?? "https://politiza.ia.br",
  "https://politiza.ia.br",
  "https://politiza-ia.lovable.app",
  "https://id-preview--f380f93a-c842-436f-b4cc-1c33f0a98846.lovable.app",
  "http://localhost:8080",
]);

function buildCorsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://politiza.ia.br";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-4-6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  messages?: ChatMessage[];
  // Filtro opcional para focar o cruzamento (ex.: nome de município)
  municipio?: string;
}

const SYSTEM_PROMPT = `Você é o Redator-Chefe de IA da plataforma Politiza IA, com o padrão
editorial e as competências de apuração da Gazeta do Povo: texto direto, factual,
bem hierarquizado (lide + desenvolvimento), rigor no uso de números e fontes, e
argumentação persuasiva construída sobre evidência — nunca sobre adjetivação vazia.

MÉTODO DE TRABALHO
1. Leia o CONTEXTO DE DADOS DA PLATAFORMA fornecido abaixo (emendas parlamentares,
   ativos políticos, ações de campo, pesquisas eleitorais). Esses dados são a
   fonte primária e têm precedência sobre qualquer informação genérica.
2. Cruze os dados entre si antes de escrever: relacione valores de emendas com o
   município e a área temática, compare com o histórico de ações e o clima das
   pesquisas na mesma região quando fizer sentido para o pedido.
3. Use web_search apenas para checar contexto público adicional (notícias,
   dados oficiais atualizados) — nunca para substituir os dados internos.
4. Produza o formato pedido (nota para imprensa, artigo, post, discurso, thread,
   release) já pronto para publicação, com título e, quando fizer sentido,
   sugestão de linha de manchete.

REGRAS EDITORIAIS (INEGOCIÁVEIS)
- Vocabulário responsável: "indícios", "segundo levantamento", "de acordo com os
  dados" — nunca "roubo", "fraude", "esquema" ou outra acusação sem base factual
  explícita nos dados fornecidos.
- Nunca cite nome de partido ao tratar de alianças ou disputas (fale em "forças
  políticas regionais", não no partido em si).
- Toda cifra citada (valores de emenda, percentuais de pesquisa) deve vir
  literalmente do CONTEXTO DE DADOS — não estime ou arredonde de forma que
  distorça o valor original.
- Nunca invente números, fontes ou declarações que não estejam no contexto ou
  em uma busca real.`;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("Origin"));
  const json = (body: unknown, status = 200) =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub;

    // Acesso exclusivo: só quem tem grant em redator_gazeta_access, sem
    // atalho por role/admin_master.
    const { data: grant, error: grantErr } = await db
      .from("redator_gazeta_access")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (grantErr || !grant) {
      return json({ error: "Forbidden" }, 403);
    }

    if (!ANTHROPIC_API_KEY) {
      return json({ error: "ANTHROPIC_API_KEY não configurada." }, 500);
    }

    const body = (await req.json()) as Body;
    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return json({ error: "messages obrigatório" }, 400);
    }

    // ── Monta o contexto de dados cruzando as fontes da plataforma ──────────
    const municipioFilter = body.municipio?.trim();

    let emendasQuery = db
      .from("emendas")
      .select("exercicio, tipo, ente_federativo, municipio, area_tematica, finalidade, valor_total, status, unidade_beneficiaria")
      .order("valor_total", { ascending: false })
      .limit(80);
    if (municipioFilter) emendasQuery = emendasQuery.ilike("municipio", `%${municipioFilter}%`);
    const { data: emendas } = await emendasQuery;

    let assetsQuery = db
      .from("political_assets")
      .select("name, role, alignment_status, influence_level, macroregion_id")
      .limit(60);
    const { data: assets } = await assetsQuery;

    const { data: actions } = await db
      .from("actions")
      .select("title, status, macroregion_id, estimated_impact, planned_date")
      .is("deleted_at", null)
      .order("planned_date", { ascending: false })
      .limit(40);

    const { data: macroregions } = await db.from("macroregions").select("id, name");

    const emendasTotal = (emendas ?? []).reduce((s, e: any) => s + (e.valor_total ?? 0), 0);
    const emendasPorMunicipio: Record<string, number> = {};
    for (const e of emendas ?? []) {
      const key = (e as any).municipio ?? "Sem município";
      emendasPorMunicipio[key] = (emendasPorMunicipio[key] ?? 0) + ((e as any).valor_total ?? 0);
    }

    const dataContext = {
      filtro_municipio: municipioFilter ?? null,
      emendas: {
        total_registros: (emendas ?? []).length,
        valor_total_destinado: emendasTotal,
        valor_total_por_municipio: emendasPorMunicipio,
        registros: emendas ?? [],
      },
      ativos_politicos: assets ?? [],
      acoes_recentes: actions ?? [],
      macrorregioes: macroregions ?? [],
    };

    const systemWithContext =
      SYSTEM_PROMPT +
      "\n\nCONTEXTO DE DADOS DA PLATAFORMA (JSON):\n" +
      JSON.stringify(dataContext);

    const payload = {
      model: MODEL,
      max_tokens: 4000,
      system: systemWithContext,
      messages,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
    };

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      const lower = text.toLowerCase();
      if (lower.includes("credit balance is too low") || lower.includes("insufficient")) {
        return json({
          error: "Sem saldo na Anthropic. Recarregue créditos em https://console.anthropic.com/settings/billing.",
          fallback: true,
          reason: "no_credits",
        }, 402);
      }
      if (aiRes.status === 429) {
        return json({ error: "Limite de requisições atingido. Aguarde um momento.", fallback: true, reason: "rate_limit" }, 429);
      }
      if (aiRes.status === 401 || aiRes.status === 403) {
        return json({ error: "Chave da Anthropic inválida ou sem permissão.", fallback: true, reason: "auth" }, aiRes.status);
      }
      return json({ error: `Anthropic API [${aiRes.status}]: ${text}`, fallback: true, reason: "upstream" }, 502);
    }

    const data = await aiRes.json();

    let text = "";
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text;
      }
    }

    // Persiste histórico (best-effort — não bloqueia a resposta em caso de erro)
    try {
      const lastUser = messages[messages.length - 1];
      await db.from("redator_gazeta_messages").insert([
        { user_id: userId, role: "user", content: lastUser?.content ?? "" },
        { user_id: userId, role: "assistant", content: text },
      ]);
    } catch {
      // ignore
    }

    return json({ text, model: MODEL, usage: data.usage });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
