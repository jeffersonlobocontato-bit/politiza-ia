import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const db = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────
interface StrategicAlert {
  type: 'risco_operacional' | 'risco_eleitoral' | 'ineficiencia_atuacao' | 'oportunidade_estrategica';
  title: string;
  description: string;
  recommendation: string;
  severity: number;
  score: number;
  territory?: string;
  macroregion_id?: string | null;
  municipality?: string;
  risk_index?: number;
  opportunity_index?: number;
  source_data?: Record<string, unknown>;
}

// ─── AI recommendation ────────────────────────────────────────────────────────
async function getAIRecommendation(context: string): Promise<string> {
  if (!LOVABLE_API_KEY) return 'Acionar coordenação regional para análise imediata.';
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Você é o estrategista sênior da campanha de Sérgio Moro ao Governo do Paraná 2026. Tese central: "Moro é o guardião do dinheiro das famílias paranaenses". Gere UMA recomendação OBJETIVA e ACIONÁVEL pró-Moro em português, máximo 2 frases diretas.
REGRAS: nunca cite nomes de partidos ao falar de alianças ou oportunidades (ex: "consolidar alianças regionais", NÃO "consolidar aliança com PSD"); vocabulário responsável (indícios, apontamentos, segundo reportagem — nunca roubo, fraude, esquema, crime, quadrilha); todo insight deve ser alerta contra adversários, ponto de atenção sobre Moro ou sugestão de melhoria pró-Moro. Foque em ação concreta que a campanha pode executar agora.`,
          },
          { role: 'user', content: context },
        ],
        max_tokens: 200,
      }),
    });
    if (!res.ok) return 'Verificar situação com coordenação regional e definir plano de ação emergencial.';
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? 'Acionar coordenação imediatamente.';
  } catch {
    return 'Acionar coordenação regional para análise e plano de ação imediato.';
  }
}

// ─── Compute risk/opportunity indices ────────────────────────────────────────
function computeRiskIndex(params: {
  delayRate: number;
  execRate: number;
  daysSinceLastAction: number;
  overdueCount: number;
  totalActions: number;
}): number {
  const { delayRate, execRate, daysSinceLastAction, overdueCount, totalActions } = params;
  let risk = 0;
  risk += Math.min(delayRate * 0.4, 40);          // up to 40 pts from delay rate
  risk += Math.min((100 - execRate) * 0.3, 30);   // up to 30 pts from low execution
  risk += Math.min(daysSinceLastAction * 0.5, 20); // up to 20 pts from inactivity
  risk += Math.min((overdueCount / Math.max(totalActions, 1)) * 100 * 0.1, 10); // up to 10 pts overdue
  return Math.min(Math.round(risk * 100) / 100, 100);
}

function computeOpportunityIndex(params: {
  pendingCount: number;
  indecisoRate: number;
  assetsAligned: number;
  totalAssets: number;
  execRate: number;
}): number {
  const { pendingCount, indecisoRate, assetsAligned, totalAssets, execRate } = params;
  let opp = 0;
  opp += Math.min(indecisoRate * 0.5, 50);         // indecisos = high opportunity
  opp += Math.min((assetsAligned / Math.max(totalAssets, 1)) * 100 * 0.3, 30); // aligned assets
  opp += Math.min(pendingCount * 0.5, 15);          // pending confirmations
  opp += Math.min(execRate * 0.05, 5);              // execution contributes small bonus
  return Math.min(Math.round(opp * 100) / 100, 100);
}

// ─── Main analysis engine ──────────────────────────────────────────────────────
async function runAnalysis(): Promise<{ inserted: number; alerts: StrategicAlert[] }> {
  const now = new Date();
  const alerts: StrategicAlert[] = [];

  // 1. Fetch all live data from DB
  const [
    { data: actions },
    { data: macroregions },
    { data: assets },
    { data: surveys },
    { data: surveyQuestions },
    { data: surveyResults },
    { data: members },
  ] = await Promise.all([
    db.from('actions').select('*').is('deleted_at', null),
    db.from('macroregions').select('*'),
    db.from('political_assets').select('*').is('deleted_at', null),
    db.from('electoral_surveys').select('*').is('deleted_at', null),
    db.from('survey_questions').select('*'),
    db.from('survey_results').select('*'),
    db.from('campaign_members').select('*'),
  ]);

  const allActions = actions ?? [];
  const allMacros = macroregions ?? [];
  const allAssets = assets ?? [];
  const allSurveys = surveys ?? [];
  const allQuestions = surveyQuestions ?? [];
  const allResults = surveyResults ?? [];
  const allMembers = members ?? [];

  // ── Aggregate per macroregion ──────────────────────────────────────────────
  interface MacroStats {
    name: string;
    total: number;
    done: number;
    delayed: number;
    inProgress: number;
    overdue: number;
    lastActionDate: Date | null;
    avgImpact: number;
  }

  const macroStats: Record<string, MacroStats> = {};
  for (const macro of allMacros) {
    macroStats[macro.id] = {
      name: macro.name,
      total: 0, done: 0, delayed: 0, inProgress: 0, overdue: 0,
      lastActionDate: null, avgImpact: 0,
    };
  }
  macroStats['unknown'] = { name: 'Sem região', total: 0, done: 0, delayed: 0, inProgress: 0, overdue: 0, lastActionDate: null, avgImpact: 0 };

  let totalImpact = 0;
  let impactCount = 0;
  for (const a of allActions) {
    const k = a.macroregion_id ?? 'unknown';
    if (!macroStats[k]) macroStats[k] = { name: k, total: 0, done: 0, delayed: 0, inProgress: 0, overdue: 0, lastActionDate: null, avgImpact: 0 };
    macroStats[k].total++;
    if (a.status === 'realizada') {
      macroStats[k].done++;
      if (a.estimated_impact) { totalImpact += a.estimated_impact; impactCount++; }
      const d = new Date(a.executed_date ?? a.updated_at);
      if (!macroStats[k].lastActionDate || d > macroStats[k].lastActionDate!) macroStats[k].lastActionDate = d;
    }
    if (a.status === 'atrasada') macroStats[k].delayed++;
    if (a.status === 'em_andamento') macroStats[k].inProgress++;
    if (['prevista','confirmada'].includes(a.status) && new Date(a.planned_date) < now) macroStats[k].overdue++;
  }

  // ── Assets per macroregion ─────────────────────────────────────────────────
  interface AssetStats {
    total: number;
    aligned: number;
    opposition: number;
    highInfluence: number;
  }
  const assetStats: Record<string, AssetStats> = {};
  for (const asset of allAssets) {
    const k = asset.macroregion_id ?? 'unknown';
    if (!assetStats[k]) assetStats[k] = { total: 0, aligned: 0, opposition: 0, highInfluence: 0 };
    assetStats[k].total++;
    if (['alinhado','provavel'].includes(asset.alignment_status)) assetStats[k].aligned++;
    if (asset.alignment_status === 'oposicao') assetStats[k].opposition++;
    if (asset.influence_level >= 8) assetStats[k].highInfluence++;
  }

  // ── Survey indecision analysis ─────────────────────────────────────────────
  const EXCLUDED_CANDIDATES = ['Não sabe', 'Não opinou', 'Nenhum', 'Branco', 'Nulo', 'Ninguém', 'Poderia votar'];
  let globalIndecidoRate = 0;
  let surveyCount = 0;

  for (const survey of allSurveys) {
    const questions = allQuestions.filter((q: { survey_id: string; question_type?: string }) => q.survey_id === survey.id && q.question_type === 'estimulada');
    for (const q of questions) {
      const results = allResults.filter((r: { question_id: string }) => r.question_id === q.id);
      const indeciso = results
        .filter((r: { candidate_name: string }) => EXCLUDED_CANDIDATES.some(ex => r.candidate_name.includes(ex)))
        .reduce((sum: number, r: { percentage: number }) => sum + Number(r.percentage), 0);
      globalIndecidoRate += indeciso;
      surveyCount++;
    }
  }
  const avgIndecidoRate = surveyCount > 0 ? globalIndecidoRate / surveyCount : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RULE ENGINE — generate alerts
  // ─────────────────────────────────────────────────────────────────────────

  // Batch AI calls to keep latency low — collect contexts first
  const aiContexts: Array<{ context: string; alert: Partial<StrategicAlert> }> = [];

  for (const [macroId, stats] of Object.entries(macroStats)) {
    if (stats.total === 0 && !assetStats[macroId]) continue;

    const execRate = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
    const delayRate = stats.total > 0 ? (stats.delayed / stats.total) * 100 : 0;
    const daysSinceLast = stats.lastActionDate
      ? (now.getTime() - stats.lastActionDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    const riskIndex = computeRiskIndex({
      delayRate, execRate, daysSinceLastAction: daysSinceLast,
      overdueCount: stats.overdue, totalActions: stats.total,
    });

    const ast = assetStats[macroId] ?? { total: 0, aligned: 0, opposition: 0, highInfluence: 0 };
    const oppIndex = computeOpportunityIndex({
      pendingCount: stats.total - stats.done,
      indecisoRate: avgIndecidoRate,
      assetsAligned: ast.aligned,
      totalAssets: ast.total,
      execRate,
    });

    // RULE 1 — Region inactive for 14+ days
    if (stats.total > 0 && daysSinceLast >= 14) {
      aiContexts.push({
        context: `Região ${stats.name} está sem ações realizadas há ${Math.round(daysSinceLast)} dias. Total de ações: ${stats.total}. Ações atrasadas: ${stats.delayed}.`,
        alert: {
          type: 'risco_operacional',
          title: `Região inativa — ${stats.name}`,
          description: `Nenhuma ação realizada nos últimos ${Math.round(daysSinceLast)} dias (${stats.total} ações cadastradas).`,
          severity: daysSinceLast >= 30 ? 9 : 7,
          score: riskIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          risk_index: riskIndex,
          opportunity_index: oppIndex,
          source_data: { daysSinceLast: Math.round(daysSinceLast), total: stats.total, execRate },
        },
      });
    }

    // RULE 2 — High delay rate (>= 30%)
    if (stats.total >= 3 && delayRate >= 30) {
      const sev = delayRate >= 60 ? 10 : delayRate >= 45 ? 8 : 7;
      aiContexts.push({
        context: `Região ${stats.name}: ${stats.delayed} de ${stats.total} ações atrasadas (${delayRate.toFixed(0)}%). Taxa de execução: ${execRate.toFixed(0)}%.`,
        alert: {
          type: 'risco_operacional',
          title: `Alta taxa de atraso — ${stats.name}`,
          description: `${stats.delayed} de ${stats.total} ações atrasadas (${delayRate.toFixed(0)}%). Taxa de execução atual: ${execRate.toFixed(0)}%.`,
          severity: sev,
          score: riskIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          risk_index: riskIndex,
          source_data: { delayRate, execRate, delayed: stats.delayed, total: stats.total },
        },
      });
    }

    // RULE 3 — Low execution rate + many actions
    if (stats.total >= 5 && execRate < 40) {
      aiContexts.push({
        context: `Região ${stats.name} com baixíssima execução: apenas ${execRate.toFixed(0)}% das ${stats.total} ações realizadas. Indecisos nas pesquisas: ${avgIndecidoRate.toFixed(1)}%.`,
        alert: {
          type: 'ineficiencia_atuacao',
          title: `Baixa execução crítica — ${stats.name}`,
          description: `Apenas ${execRate.toFixed(0)}% das ${stats.total} ações realizadas. ${stats.overdue} ações com prazo vencido sem execução.`,
          severity: 7,
          score: riskIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          risk_index: riskIndex,
          source_data: { execRate, total: stats.total, overdue: stats.overdue },
        },
      });
    }

    // RULE 4 — Overdue actions (>= 3)
    if (stats.overdue >= 3) {
      aiContexts.push({
        context: `${stats.overdue} ações com data vencida ainda não executadas na região ${stats.name}. Total de ações: ${stats.total}. Atrasadas: ${stats.delayed}.`,
        alert: {
          type: 'risco_operacional',
          title: `Ações vencidas sem execução — ${stats.name}`,
          description: `${stats.overdue} ações com data passada aguardando execução ou cancelamento na região ${stats.name}.`,
          severity: 6,
          score: riskIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          risk_index: riskIndex,
          source_data: { overdue: stats.overdue, total: stats.total },
        },
      });
    }

    // RULE 5 — High impact potential + low action frequency (opportunity)
    if (ast.total >= 5 && ast.aligned >= 3 && (stats.total < 3 || execRate < 50)) {
      aiContexts.push({
        context: `Região ${stats.name} tem ${ast.aligned} de ${ast.total} lideranças alinhadas, mas apenas ${stats.done} ações realizadas. Alta oportunidade de mobilização.`,
        alert: {
          type: 'oportunidade_estrategica',
          title: `Oportunidade de mobilização — ${stats.name}`,
          description: `${ast.aligned} lideranças alinhadas disponíveis na região, com potencial subutilizado. Apenas ${stats.done} ações realizadas até o momento.`,
          severity: 5,
          score: oppIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          opportunity_index: oppIndex,
          source_data: { assetsAligned: ast.aligned, totalAssets: ast.total, done: stats.done },
        },
      });
    }

    // RULE 6 — High opposition assets
    if (ast.total >= 3 && ast.opposition >= 2) {
      const oppositionRate = (ast.opposition / ast.total) * 100;
      aiContexts.push({
        context: `Região ${stats.name}: ${ast.opposition} de ${ast.total} ativos políticos em oposição (${oppositionRate.toFixed(0)}%). ${ast.highInfluence} são de alta influência (nível 8+).`,
        alert: {
          type: 'risco_eleitoral',
          title: `Alta presença de oposição — ${stats.name}`,
          description: `${ast.opposition} ativos políticos classificados como oposição (${oppositionRate.toFixed(0)}% do total). ${ast.highInfluence > 0 ? `${ast.highInfluence} de alta influência.` : ''}`,
          severity: ast.highInfluence >= 1 ? 8 : 6,
          score: riskIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          risk_index: riskIndex,
          source_data: { opposition: ast.opposition, totalAssets: ast.total, highInfluence: ast.highInfluence },
        },
      });
    }

    // RULE 7 — High impact actions with zero execution (wasted potential)
    const highImpactPending = allActions.filter(
      a => (a.macroregion_id ?? 'unknown') === macroId && a.estimated_impact >= 200 && !['realizada','cancelada'].includes(a.status)
    ).length;
    if (highImpactPending >= 2) {
      aiContexts.push({
        context: `Região ${stats.name} tem ${highImpactPending} ações de alto impacto (estimativa 200+ pessoas) ainda não realizadas. Taxa de execução geral: ${execRate.toFixed(0)}%.`,
        alert: {
          type: 'ineficiencia_atuacao',
          title: `Alto impacto represado — ${stats.name}`,
          description: `${highImpactPending} ações com alto impacto estimado aguardando execução na região ${stats.name}.`,
          severity: 7,
          score: riskIndex,
          territory: stats.name,
          macroregion_id: macroId === 'unknown' ? null : macroId,
          risk_index: riskIndex,
          source_data: { highImpactPending, execRate },
        },
      });
    }
  }

  // RULE 8 — Global: indecisos in surveys = opportunity
  if (avgIndecidoRate >= 20 && allActions.length >= 10) {
    const totalPendingActions = allActions.filter(a => !['realizada','cancelada'].includes(a.status)).length;
    aiContexts.push({
      context: `As pesquisas eleitorais mostram em média ${avgIndecidoRate.toFixed(1)}% de indecisos. Há ${totalPendingActions} ações pendentes que podem converter esse eleitorado.`,
      alert: {
        type: 'oportunidade_estrategica',
        title: `Alto índice de indecisos nas pesquisas`,
        description: `${avgIndecidoRate.toFixed(1)}% de indecisos identificados nas pesquisas eleitorais. Janela de oportunidade para conversão via mobilização territorial.`,
        severity: 6,
        score: avgIndecidoRate,
        territory: 'Estado do Paraná',
        opportunity_index: avgIndecidoRate,
        source_data: { avgIndecidoRate, surveys: allSurveys.length, pendingActions: totalPendingActions },
      },
    });
  }

  // RULE 9 — Global: no actions in any region = critical operational risk
  if (allActions.length === 0) {
    aiContexts.push({
      context: 'Nenhuma ação cadastrada na plataforma. A campanha está sem registro de atividades de campo.',
      alert: {
        type: 'risco_operacional',
        title: 'Campanha sem ações registradas',
        description: 'Nenhuma ação de campo foi cadastrada na plataforma. Impossível monitorar progresso territorial.',
        severity: 10,
        score: 100,
        territory: 'Estado do Paraná',
        risk_index: 100,
        source_data: { totalActions: 0 },
      },
    });
  }

  // RULE 10 — Members without actions managed
  const inactiveMembers = allMembers.filter(m => m.actions_managed === 0 && m.status === 'ativo').length;
  if (inactiveMembers >= 3) {
    aiContexts.push({
      context: `${inactiveMembers} membros ativos da campanha sem nenhuma ação gerenciada. Capacidade da equipe subutilizada.`,
      alert: {
        type: 'ineficiencia_atuacao',
        title: `Equipe ociosa — ${inactiveMembers} membros sem ações`,
        description: `${inactiveMembers} membros ativos da hierarquia de campanha sem ações gerenciadas. Potencial de atuação desperdiçado.`,
        severity: 5,
        score: Math.min(inactiveMembers * 5, 80),
        territory: 'Estado do Paraná',
        source_data: { inactiveMembers },
      },
    });
  }

  // ── Enrich with AI recommendations in parallel (limit to 6 to avoid rate limits)
  const limited = aiContexts.slice(0, 6);
  const recommendations = await Promise.all(
    limited.map(({ context }) => getAIRecommendation(context))
  );

  for (let i = 0; i < limited.length; i++) {
    const partial = limited[i].alert;
    alerts.push({
      type: partial.type!,
      title: partial.title!,
      description: partial.description ?? '',
      recommendation: recommendations[i],
      severity: partial.severity ?? 5,
      score: partial.score ?? 0,
      territory: partial.territory,
      macroregion_id: partial.macroregion_id,
      municipality: partial.municipality,
      risk_index: partial.risk_index,
      opportunity_index: partial.opportunity_index,
      source_data: partial.source_data,
    });
  }

  // Add remaining without AI (use generic recommendation)
  for (let i = 6; i < aiContexts.length; i++) {
    const partial = aiContexts[i].alert;
    alerts.push({
      type: partial.type!,
      title: partial.title!,
      description: partial.description ?? '',
      recommendation: 'Acionar coordenação regional para análise e intervenção.',
      severity: partial.severity ?? 5,
      score: partial.score ?? 0,
      territory: partial.territory,
      macroregion_id: partial.macroregion_id,
      municipality: partial.municipality,
      risk_index: partial.risk_index,
      opportunity_index: partial.opportunity_index,
      source_data: partial.source_data,
    });
  }

  // ── Delete old auto-generated alerts (keep last 7 days manually resolved)
  await db
    .from('strategic_alerts')
    .delete()
    .in('status', ['ativo', 'em_analise'])
    .lt('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()); // older than 2h

  // ── Insert new alerts
  if (alerts.length > 0) {
    const { error } = await db.from('strategic_alerts').insert(alerts);
    if (error) throw error;
  }

  return { inserted: alerts.length, alerts };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require valid JWT + admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await db.rpc('is_admin', { _user_id: claimsData.claims.sub });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await runAnalysis();
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Strategic analysis error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
