// Edge Function: raio-x-chat v4.0
// Chama Anthropic API diretamente com web_search habilitado.
// Público (verify_jwt=false) porque o painel abre em nova aba sem sessão.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-4-5";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  system?: string;
  messages?: ChatMessage[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(null, 200);

  try {
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
      if (aiRes.status === 429) {
        return json({ error: "Limite de requisições atingido. Aguarde um momento." }, 429);
      }
      if (aiRes.status === 402) {
        return json({ error: "Créditos Anthropic insuficientes." }, 402);
      }
      return json({ error: `Anthropic API [${aiRes.status}]: ${text}` }, 500);
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
