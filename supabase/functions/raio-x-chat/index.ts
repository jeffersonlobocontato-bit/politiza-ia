// Edge Function: raio-x-chat
// Proxy simples para o Lovable AI Gateway usado pelo painel RAIO-X (HTML estático).
// Público (verify_jwt=false) porque o painel abre em nova aba sem sessão Supabase.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Body {
  system?: string;
  messages?: ChatMessage[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente." }, 500);
    const body = (await req.json()) as Body;
    const messages: ChatMessage[] = [];
    if (body.system) messages.push({ role: "system", content: body.system });
    if (Array.isArray(body.messages)) messages.push(...body.messages);
    if (messages.length === 0) return json({ error: "messages obrigatório" }, 400);

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 4000 }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "Limite de requisições excedido." }, 429);
      if (aiRes.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
      return json({ error: `AI Gateway [${aiRes.status}]: ${text}` }, 500);
    }

    const data = await aiRes.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return json({ text });
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
