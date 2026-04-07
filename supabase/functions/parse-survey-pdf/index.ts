import { corsHeaders } from "@supabase/supabase-js/cors";

const AI_GATEWAY_URL = "https://ai-gateway.lovable.dev/v1/chat/completions";

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
  "govCandidates": [
    { "name": "Nome Completo do Candidato", "pct": "25.3" }
  ],
  "senCandidates": [
    { "name": "Nome Completo do Candidato", "pct": "18.7" }
  ]
}

REGRAS IMPORTANTES:
- Para candidatos, extraia APENAS dados de intenção de voto ESTIMULADA (cenário principal/primeiro cenário)
- Inclua candidatos com nome real, NÃO inclua "Branco/Nulo", "NS/NR", "Nenhum", "Outros" como candidatos
- Se não houver dados para governador, deixe govCandidates como array vazio
- Se não houver dados para senador, deixe senCandidates como array vazio  
- Os percentuais devem ser números (ex: "25.3", não "25,3%")
- Se não encontrar algum dado, use string vazia "" ou 0
- Datas devem estar no formato YYYY-MM-DD
- NÃO inclua dados de aprovação de governo, avaliação, rejeição - apenas intenção de voto estimulada
- Se houver múltiplos cenários de estimulada, use APENAS o primeiro/principal`;

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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum 10MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const mimeType = file.type || "application/pdf";

    // Call AI model with the PDF
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
                text: "Extraia todos os dados desta pesquisa eleitoral. Retorne APENAS o JSON, sem markdown.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error [${aiResponse.status}]: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    // Try to parse the JSON from the response (strip markdown if present)
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
