// Edge Function: raio-x-chat v5.0
// Chama Anthropic API diretamente com web_search habilitado.
// Requer sessão Supabase válida + role admin_master/coordenador_geral/
// coordenador_estadual (verify_jwt=true no config.toml).

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
const MODEL = "claude-sonnet-4-5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  system?: string;
  messages?: ChatMessage[];
}

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

    const { data: allowed, error: roleErr } = await db.rpc("is_admin", {
      _user_id: userId,
    });
    if (roleErr || !allowed) {
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

    const payload = {
      model: MODEL,
      max_tokens: 4000,
      system: body.system ?? "",
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
          error: "Sem saldo na Anthropic. Recarregue créditos em https://console.anthropic.com/settings/billing para reativar o RAIO-X.",
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
      if (aiRes.status === 402) {
        return json({ error: "Créditos Anthropic insuficientes.", fallback: true, reason: "no_credits" }, 402);
      }
      return json({ error: `Anthropic API [${aiRes.status}]: ${text}`, fallback: true, reason: "upstream" }, 502);
    }

    const data = await aiRes.json();

    let text = "";
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") {
          text += block.text;
        }
      }
    }

    return json({ text, model: MODEL, usage: data.usage });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
