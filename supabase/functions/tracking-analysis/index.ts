import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { round_id, candidate_id } = await req.json();
    if (!round_id || !candidate_id) {
      return new Response(JSON.stringify({ error: "round_id and candidate_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get round info
    const { data: round } = await supabase.from("tracking_rounds").select("*").eq("id", round_id).single();
    if (!round) throw new Error("Round not found");

    // 2. Get interviews + answers for this round
    const { data: interviews } = await supabase
      .from("tracking_interviews")
      .select("*, tracking_interview_answers(*)")
      .eq("round_id", round_id);

    // 3. Get field actions in the round period
    const startDate = round.start_date;
    const endDate = round.end_date || new Date().toISOString().split("T")[0];
    const { data: actions } = await supabase
      .from("actions")
      .select("*")
      .is("deleted_at", null)
      .gte("planned_date", startDate)
      .lte("planned_date", endDate);

    // 4. Aggregate data by municipality
    const municipalities = new Set<string>();
    const trackingByCity: Record<string, { total: number; stimulated: Record<string, number>; rejection: Record<string, number>; undecided: number }> = {};

    (interviews ?? []).forEach((interview: any) => {
      const city = interview.municipality || "Desconhecido";
      municipalities.add(city);
      if (!trackingByCity[city]) trackingByCity[city] = { total: 0, stimulated: {}, rejection: {}, undecided: 0 };
      trackingByCity[city].total++;

      (interview.tracking_interview_answers ?? []).forEach((a: any) => {
        if (a.question_key === "intencao_voto_estimulada") {
          const val = a.answer_value || "Outros";
          trackingByCity[city].stimulated[val] = (trackingByCity[city].stimulated[val] || 0) + 1;
          if (["indeciso", "não sabe", "nao sabe", "ns/nr"].includes(val.toLowerCase())) {
            trackingByCity[city].undecided++;
          }
        }
        if (a.question_key === "rejeicao") {
          const val = a.answer_value || "Outros";
          trackingByCity[city].rejection[val] = (trackingByCity[city].rejection[val] || 0) + 1;
        }
      });
    });

    // Actions by city
    const actionsByCity: Record<string, { total: number; completed: number; delayed: number; people: number }> = {};
    (actions ?? []).forEach((a: any) => {
      const city = a.municipality || "Desconhecido";
      if (!actionsByCity[city]) actionsByCity[city] = { total: 0, completed: 0, delayed: 0, people: 0 };
      actionsByCity[city].total++;
      if (a.status === "realizada") { actionsByCity[city].completed++; actionsByCity[city].people += a.executed_people_count || 0; }
      if (a.status === "atrasada") actionsByCity[city].delayed++;
    });

    // 5. Calculate indices and generate insights/alerts
    const allCities = new Set([...Object.keys(trackingByCity), ...Object.keys(actionsByCity)]);
    const newInsights: any[] = [];
    const newAlerts: any[] = [];

    for (const city of allCities) {
      const tracking = trackingByCity[city] || { total: 0, stimulated: {}, rejection: {}, undecided: 0 };
      const fieldActions = actionsByCity[city] || { total: 0, completed: 0, delayed: 0, people: 0 };

      // Capillarity Index (0-100)
      const actionFreq = Math.min(fieldActions.total / 5, 1) * 30; // up to 30
      const completionRate = fieldActions.total > 0 ? (fieldActions.completed / fieldActions.total) * 25 : 0; // up to 25
      const coverageScore = tracking.total > 0 ? Math.min(tracking.total / 10, 1) * 25 : 0; // up to 25
      const peopleScore = Math.min(fieldActions.people / 500, 1) * 20; // up to 20
      const capillarityIndex = Math.round(actionFreq + completionRate + coverageScore + peopleScore);

      // Efficiency Index (0-100)
      const effortScore = fieldActions.total * 10 + fieldActions.people;
      const trackingResponse = tracking.total;
      const efficiencyIndex = effortScore > 0 ? Math.round(Math.min((trackingResponse / (effortScore / 100)) * 50, 100)) : 0;

      // Priority Index (0-100)
      const undecidedRate = tracking.total > 0 ? (tracking.undecided / tracking.total) * 100 : 0;
      const lowPresence = fieldActions.total < 3 ? 30 : fieldActions.total < 5 ? 15 : 0;
      const lowCapillarity = capillarityIndex < 30 ? 30 : capillarityIndex < 50 ? 15 : 0;
      const highUndecided = undecidedRate > 30 ? 25 : undecidedRate > 15 ? 10 : 0;
      const priorityIndex = Math.min(Math.round(lowPresence + lowCapillarity + highUndecided + (100 - capillarityIndex) * 0.15), 100);

      const sourceData = { tracking, fieldActions, capillarityIndex, efficiencyIndex, priorityIndex };

      // Rule: city with no recent actions -> low capillarity alert
      if (fieldActions.total === 0 && city !== "Desconhecido") {
        newAlerts.push({
          round_id, candidate_id,
          alert_type: "baixa_capilaridade",
          municipality: city,
          title: `${city}: Sem ações de campo no período`,
          description: `A cidade ${city} não possui ações de campo registradas durante esta rodada de tracking.`,
          recommendation: `Agendar ações de mobilização e presença do candidato em ${city} para aumentar a capilaridade territorial.`,
          severity: 8, priority_score: priorityIndex, field_actions_count: 0,
          tracking_variation: 0, capillarity_index: capillarityIndex, generated_from: sourceData,
        });
      }

      // Rule: high undecided + low actions -> opportunity
      if (undecidedRate > 20 && fieldActions.total < 3 && city !== "Desconhecido") {
        newAlerts.push({
          round_id, candidate_id,
          alert_type: "indecisos_altos",
          municipality: city,
          title: `${city}: Alto índice de indecisos com baixa ativação`,
          description: `${undecidedRate.toFixed(0)}% de indecisos detectados com apenas ${fieldActions.total} ações de campo.`,
          recommendation: `Intensificar presença em ${city} com ações de porta-a-porta e eventos comunitários para converter indecisos.`,
          severity: 7, priority_score: priorityIndex, field_actions_count: fieldActions.total,
          tracking_variation: 0, capillarity_index: capillarityIndex, generated_from: sourceData,
        });
      }

      // Rule: many actions but low tracking -> low efficiency
      if (fieldActions.total >= 5 && tracking.total < 3 && city !== "Desconhecido") {
        newInsights.push({
          round_id, candidate_id,
          insight_type: "eficiencia",
          municipality: city,
          title: `${city}: Alta atuação, baixo retorno no tracking`,
          description: `${fieldActions.total} ações realizadas mas apenas ${tracking.total} entrevistas captaram intenção de voto.`,
          recommendation: `Revisar estratégia em ${city}: qualidade das ações pode ser mais importante que quantidade.`,
          severity: 6, priority_score: priorityIndex,
          capillarity_score: capillarityIndex, efficiency_score: efficiencyIndex, source_data: sourceData,
        });
      }

      // Rule: good actions + good tracking -> performance insight
      if (fieldActions.completed >= 3 && tracking.total >= 5 && capillarityIndex >= 50) {
        newInsights.push({
          round_id, candidate_id,
          insight_type: "performance",
          municipality: city,
          title: `${city}: Boa conversão entre campo e tracking`,
          description: `${fieldActions.completed} ações concluídas e ${tracking.total} entrevistas com capilaridade de ${capillarityIndex}/100.`,
          recommendation: `Manter estratégia em ${city} e replicar modelo para cidades próximas.`,
          severity: 3, priority_score: Math.max(0, 50 - capillarityIndex),
          capillarity_score: capillarityIndex, efficiency_score: efficiencyIndex, source_data: sourceData,
        });
      }

      // Low capillarity general alert
      if (capillarityIndex < 30 && fieldActions.total > 0 && city !== "Desconhecido") {
        newAlerts.push({
          round_id, candidate_id,
          alert_type: "baixa_capilaridade",
          municipality: city,
          title: `${city}: Capilaridade territorial baixa (${capillarityIndex}/100)`,
          description: `Índice de capilaridade de ${capillarityIndex}/100 indica cobertura insuficiente.`,
          recommendation: `Ampliar estrutura de lideranças e frequência de ações em ${city}.`,
          severity: 7, priority_score: priorityIndex, field_actions_count: fieldActions.total,
          tracking_variation: 0, capillarity_index: capillarityIndex, generated_from: sourceData,
        });
      }
    }

    // 6. Generate AI recommendations using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && (newAlerts.length > 0 || newInsights.length > 0)) {
      try {
        const summaryPrompt = `Você é um analista de inteligência eleitoral. Analise os seguintes dados de tracking e ações de campo e gere um resumo executivo em português com recomendações estratégicas:

ALERTAS (${newAlerts.length}):
${newAlerts.slice(0, 10).map(a => `- ${a.title}: ${a.description}`).join("\n")}

INSIGHTS (${newInsights.length}):
${newInsights.slice(0, 10).map(i => `- ${i.title}: ${i.description}`).join("\n")}

Total de entrevistas: ${interviews?.length ?? 0}
Cidades cobertas: ${municipalities.size}
Total de ações no período: ${actions?.length ?? 0}

Gere um resumo executivo curto (máx 3 parágrafos) com as principais recomendações estratégicas.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Você é um estrategista político experiente. Responda em português brasileiro." },
              { role: "user", content: summaryPrompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const summary = aiData.choices?.[0]?.message?.content;
          if (summary) {
            newInsights.push({
              round_id, candidate_id,
              insight_type: "performance",
              title: "Resumo Executivo da Rodada (IA)",
              description: summary,
              recommendation: null,
              severity: 1, priority_score: 100,
              capillarity_score: 0, efficiency_score: 0,
              source_data: { type: "ai_summary", alerts_count: newAlerts.length, insights_count: newInsights.length },
            });
          }
        }
      } catch (aiErr) {
        console.error("AI recommendation error:", aiErr);
      }
    }

    // 7. Persist results
    if (newInsights.length > 0) {
      const { error: insErr } = await supabase.from("tracking_ai_insights").insert(newInsights);
      if (insErr) console.error("Insert insights error:", insErr);
    }

    if (newAlerts.length > 0) {
      const { error: alertErr } = await supabase.from("tracking_ai_alerts").insert(newAlerts);
      if (alertErr) console.error("Insert alerts error:", alertErr);
    }

    return new Response(JSON.stringify({
      success: true,
      insights_generated: newInsights.length,
      alerts_generated: newAlerts.length,
      cities_analyzed: allCities.size,
      interviews_processed: interviews?.length ?? 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("tracking-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
