// Edge Function: chat-inteligencia
// Streams strategic analysis from the Lovable AI Gateway grounded on the
// Inteligência de Campanha dashboard context. Persists threads/messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `Você é o "Analista de Inteligência de Campanha" — um estrategista eleitoral sênior dedicado à candidatura de Sérgio Moro ao Governo do Paraná em 2026.

Sua função é fazer análises adicionais, leituras de tendências, cenários comparativos e recomendações táticas com base estritamente nos dados do painel de Inteligência fornecidos no contexto abaixo.

REGRAS:
- Responda sempre em português do Brasil, objetivo, sem floreios.
- Cite números, institutos e datas presentes nos dados — nunca invente percentuais.
- Quando houver divergência entre institutos, explicite-a (ex: IGR vs demais).
- Estruture respostas longas com seções curtas e bullets quando ajudar a leitura.
- Quando o usuário pedir "cenário", "tendência" ou "previsão", deixe claras as premissas.
- Se a pergunta sair do escopo do painel, diga isso e sugira reformular.
- Termine análises críticas com 2-3 "Próximos passos" acionáveis.`;

interface Body {
  threadId?: string;
  message: string;
  context: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const authClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verifica permissão (coordenação)
    const { data: isAdmin } = await db.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = (await req.json()) as Body;
    if (!body?.message?.trim()) return json({ error: "Missing message" }, 400);

    // Cria thread se necessário
    let threadId = body.threadId ?? null;
    if (!threadId) {
      const title = body.message.slice(0, 60).trim() || "Nova análise";
      const { data: t, error: tErr } = await db
        .from("chat_threads")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (tErr) return json({ error: tErr.message }, 500);
      threadId = t.id;
    } else {
      // Garante propriedade
      const { data: t } = await db
        .from("chat_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!t) return json({ error: "Thread not found" }, 404);
    }

    // Carrega histórico
    const { data: history } = await db
      .from("chat_messages")
      .select("role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    const priorMessages = (history ?? []).map((m: { role: string; parts: { text?: string }[] }) => ({
      role: m.role,
      content: (m.parts ?? []).map(p => p.text ?? "").join(""),
    }));

    // Persiste mensagem do usuário
    await db.from("chat_messages").insert({
      thread_id: threadId,
      role: "user",
      parts: [{ type: "text", text: body.message }],
    });

    const contextBlock = `\n\nCONTEXTO DO PAINEL DE INTELIGÊNCIA (JSON):\n${JSON.stringify(body.context ?? {}, null, 2)}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + contextBlock },
      ...priorMessages,
      { role: "user", content: body.message },
    ];

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true, temperature: 0.3 }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const text = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }, 429);
      if (aiRes.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
      return json({ error: `AI Gateway error [${aiRes.status}]: ${text}` }, 500);
    }

    // Stream: re-emit text deltas as plain text chunks to the client.
    let assistantText = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send threadId first line as JSON envelope so the client can pick it up.
        controller.enqueue(encoder.encode(`__META__${JSON.stringify({ threadId })}\n`));

        const reader = aiRes.body!.getReader();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const raw of lines) {
              const line = raw.trim();
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const evt = JSON.parse(data);
                const delta = evt.choices?.[0]?.delta?.content ?? "";
                if (delta) {
                  assistantText += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // ignore malformed lines
              }
            }
          }
          // Persiste resposta do assistente
          await db.from("chat_messages").insert({
            thread_id: threadId,
            role: "assistant",
            parts: [{ type: "text", text: assistantText }],
          });
          await db.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
