import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { roundId, candidateId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Fetch tracking data
    const headers = {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const [interviewsRes, answersRes, actionsRes, roundsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/tracking_interviews?select=*${roundId ? `&round_id=eq.${roundId}` : ''}&order=created_at.desc&limit=500`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tracking_interview_answers?select=*&limit=5000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/actions?select=*&deleted_at=is.null&order=created_at.desc&limit=500`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tracking_rounds?select=*${candidateId ? `&candidate_id=eq.${candidateId}` : ''}&deleted_at=is.null`, { headers }),
    ]);

    const interviews = await interviewsRes.json();
    const answers = await answersRes.json();
    const actions = await actionsRes.json();
    const rounds = await roundsRes.json();

    // Build summary for AI
    const interviewsByCity: Record<string, number> = {};
    (interviews || []).forEach((i: any) => {
      const city = i.municipality || 'Desconhecida';
      interviewsByCity[city] = (interviewsByCity[city] || 0) + 1;
    });

    const actionsByCity: Record<string, number> = {};
    (actions || []).forEach((a: any) => {
      const city = a.municipality || 'Desconhecida';
      actionsByCity[city] = (actionsByCity[city] || 0) + 1;
    });

    // Vote counts per candidate
    const voteCounts: Record<string, number> = {};
    (answers || []).forEach((a: any) => {
      if (a.candidate_name) {
        voteCounts[a.candidate_name] = (voteCounts[a.candidate_name] || 0) + 1;
      }
    });

    const prompt = `Você é um analista político estratégico. Analise os dados de tracking eleitoral e ações de campo abaixo e gere insights acionáveis em português brasileiro.

DADOS DE TRACKING:
- Total de entrevistas: ${interviews?.length || 0}
- Entrevistas por cidade: ${JSON.stringify(interviewsByCity)}
- Intenção de voto: ${JSON.stringify(voteCounts)}
- Rodadas ativas: ${rounds?.length || 0}

AÇÕES DE CAMPO:
- Total de ações: ${actions?.length || 0}
- Ações por cidade: ${JSON.stringify(actionsByCity)}

ANÁLISE SOLICITADA:
1. Identifique cidades com BAIXA conversão (muitas ações mas pouco resultado no tracking)
2. Identifique cidades que MELHORARAM após ações de campo
3. Identifique cidades que PIORARAM ou não foram ativadas
4. Sugira onde investir mais ações presenciais
5. Detecte tendências relevantes
6. Avalie a cobertura territorial (cidades sem entrevistas ou sem ações)

Responda em JSON com a estrutura:
{
  "insights": [
    {
      "type": "alerta" | "oportunidade" | "tendencia" | "recomendacao",
      "severity": 1-10,
      "title": "string",
      "description": "string",
      "territory": "cidade ou região",
      "recommendation": "ação sugerida"
    }
  ],
  "summary": "resumo executivo em 2-3 frases"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um analista político estratégico especializado em campanhas eleitorais brasileiras. Responda sempre em JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
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

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { insights: [], summary: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tracking-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
