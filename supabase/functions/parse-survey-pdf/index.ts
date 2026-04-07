const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const EXTRACTION_PROMPT = `Você é um especialista em análise de pesquisas eleitorais brasileiras. 
Analise o documento PDF de pesquisa eleitoral enviado e extraia TODOS os dados estruturados possíveis.

Retorne EXATAMENTE um JSON com esta estrutura (sem markdown, sem backticks, apenas o JSON puro):

{
  "institute": "Nome do instituto (ex: Paraná Pesquisas, Atlas Intel, etc.)",
  "territory": "Território da pesquisa (ex: Estado do Paraná, Curitiba, Brasil)",
  "collectionStart": "Data início coleta no formato YYYY-MM-DD ou vazio",
  "collectionEnd": "Data fim coleta no formato YYYY-MM-DD ou vazio",
  "releaseDate": "Data de divulgação no formato YYYY-MM-DD",
  "sampleSize": 0,
  "marginOfError": 0.0,
  "methodology": "Descrição da metodologia",
  "tseRegistration": "Registro no TSE ex: PR-00000/2026",
  "cargos": ["governador", "senador"],
  "govScenarios": [
    {
      "label": "Cenário 1",
      "candidates": [
        { "name": "Nome Completo do Candidato (Partido)", "pct": "25.3" }
      ]
    },
    {
      "label": "Cenário 2",
      "candidates": [
        { "name": "Nome Completo do Candidato (Partido)", "pct": "18.7" }
      ]
    }
  ],
  "senScenarios": [
    {
      "label": "Cenário 1",
      "candidates": [
        { "name": "Nome Completo do Candidato (Partido)", "pct": "21.0" }
      ]
    }
  ]
}

REGRAS IMPORTANTES:
- Extraia TODOS os cenários de intenção de voto ESTIMULADA para cada cargo (governador e senador)
- Cada cenário deve ter seu label correspondente (ex: "Cenário 1", "Cenário 2", "Cenário 3", "Cenário 4")
- Se o cenário tem contexto especial (ex: "apoiado por Bolsonaro"), inclua isso no label
- Inclua candidatos com nome real, NÃO inclua "Branco/Nulo", "NS/NR", "Nenhum", "Outros" como candidatos
- Se não houver dados para governador, deixe govScenarios como array vazio
- Se não houver dados para senador, deixe senScenarios como array vazio  
- Os percentuais devem ser números com ponto decimal (ex: "25.3", não "25,3%")
- Se não encontrar algum dado, use string vazia "" ou 0
- Datas devem estar no formato YYYY-MM-DD
- NÃO inclua dados de aprovação de governo, avaliação, rejeição, 2º turno - apenas intenção de voto estimulada 1º turno
- Para senador, se houver "Consolidado de 1º e 2º votos", trate como um cenário
- Inclua o partido entre parênteses no nome quando disponível`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum 10MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const mimeType = file.type || "application/pdf";

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: EXTRACTION_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Extraia TODOS os cenários de intenção de voto estimulada desta pesquisa eleitoral. Retorne APENAS o JSON, sem markdown.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error [${aiResponse.status}]: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "Could not extract structured data from PDF", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Backward compatibility: if old format with govCandidates/senCandidates, convert
    if (parsed.govCandidates && !parsed.govScenarios) {
      parsed.govScenarios = parsed.govCandidates.length > 0
        ? [{ label: "Cenário 1", candidates: parsed.govCandidates }]
        : [];
    }
    if (parsed.senCandidates && !parsed.senScenarios) {
      parsed.senScenarios = parsed.senCandidates.length > 0
        ? [{ label: "Cenário 1", candidates: parsed.senCandidates }]
        : [];
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error parsing survey PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
