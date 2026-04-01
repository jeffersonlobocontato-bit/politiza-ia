import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, candidateId, roundId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // Fetch agent config, knowledge, and tracking data in parallel
    const [configRes, knowledgeRes, interviewsRes, actionsRes, roundsRes, answersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/tracking_ai_config?candidate_id=eq.${candidateId}&limit=1`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tracking_ai_knowledge?candidate_id=eq.${candidateId}&select=file_name,content_text`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tracking_interviews?select=*${roundId ? `&round_id=eq.${roundId}` : ''}&order=created_at.desc&limit=500`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/actions?select=*&deleted_at=is.null&order=created_at.desc&limit=500`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tracking_rounds?select=*${candidateId ? `&candidate_id=eq.${candidateId}` : ''}&deleted_at=is.null`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tracking_interview_answers?select=*&limit=5000`, { headers }),
    ]);

    const [configArr, knowledgeDocs, interviews, actions, rounds, answers] = await Promise.all([
      configRes.json(), knowledgeRes.json(), interviewsRes.json(), actionsRes.json(), roundsRes.json(), answersRes.json(),
    ]);

    const config = configArr?.[0] || {};
    const systemInstructions = config.system_instructions || "Você é um analista político estratégico especializado em campanhas eleitorais brasileiras.";
    const model = config.model || "google/gemini-3-flash-preview";

    // Build context from tracking data
    const interviewsByCity: Record<string, number> = {};
    (interviews || []).forEach((i: any) => {
      const city = i.municipality || "Desconhecida";
      interviewsByCity[city] = (interviewsByCity[city] || 0) + 1;
    });

    const actionsByCity: Record<string, number> = {};
    (actions || []).forEach((a: any) => {
      const city = a.municipality || "Desconhecida";
      actionsByCity[city] = (actionsByCity[city] || 0) + 1;
    });

    const voteCounts: Record<string, number> = {};
    (answers || []).forEach((a: any) => {
      if (a.candidate_name) {
        voteCounts[a.candidate_name] = (voteCounts[a.candidate_name] || 0) + 1;
      }
    });

    // Build knowledge context
    const knowledgeContext = (knowledgeDocs || [])
      .filter((d: any) => d.content_text)
      .map((d: any) => `--- DOCUMENTO: ${d.file_name} ---\n${d.content_text}`)
      .join("\n\n");

    const dataContext = `
DADOS EM TEMPO REAL DA CAMPANHA:

TRACKING ELEITORAL:
- Total de entrevistas: ${interviews?.length || 0}
- Entrevistas por cidade: ${JSON.stringify(interviewsByCity)}
- Intenção de voto: ${JSON.stringify(voteCounts)}
- Rodadas: ${rounds?.length || 0}

AÇÕES DE CAMPO:
- Total de ações: ${actions?.length || 0}
- Ações por cidade: ${JSON.stringify(actionsByCity)}
`;

    const fullSystemPrompt = `${systemInstructions}

${dataContext}

${knowledgeContext ? `\nBASE DE CONHECIMENTO:\n${knowledgeContext}` : ''}

Use os dados acima para responder perguntas. Seja específico, use dados reais, e forneça recomendações acionáveis. Responda sempre em português brasileiro. Use markdown para formatação.`;

    // Call AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tracking-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
