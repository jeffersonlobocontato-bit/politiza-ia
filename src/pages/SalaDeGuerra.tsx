import { useState, useEffect } from 'react';
import { KpiCard, ChartCard, tooltipStyle, CHART_COLORS, GRADIENT_CARDS, GRID_STROKE, AXIS_TICK_LIGHT, LEGEND_STYLE } from '@/components/ui/DashboardCards';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import MapZoomControl from '@/components/maps/MapZoomControl';
import {
  Crosshair, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Users, Activity, Zap, Target,
  RefreshCw, Bell, CheckCheck, ExternalLink, ChevronRight, User, ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { useCandidate } from '@/contexts/CandidateContext';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import { municipalities } from '@/data/mockData';
import type { PollWave, PollQuestion } from '@/data/pollsData';
import { useSurveys } from '@/hooks/useSurveys';
import { useDashboardKPIs, useAlerts, useMacroStats, useMacroRegionsDB, useMarkAlertRead, useUpdateAlertStatus, useGenerateAlerts } from '@/hooks/useDashboard';
import { useActions } from '@/hooks/useActions';
import { usePoliticalAssets } from '@/hooks/usePoliticalAssets';
import { useStrategicKPIs } from '@/hooks/useStrategicAlerts';
import { supabase } from '@/integrations/supabase/client';
import type { DbAlert } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useUserParty } from '@/hooks/useUserParty';
import { useAllPartySlates } from '@/hooks/usePartySlate';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import { useLeaders } from '@/hooks/useLeaders';
import { useUnifiedPoliticalAssets, type UnifiedAssetOrigin, type UnifiedAssetType } from '@/hooks/useUnifiedPoliticalAssets';
import { PrAssociationChoropleth } from '@/components/maps/PrAssociationChoropleth';
import { TYPE_COLORS, FAMILY_META, typeMeta, type AssetFamily } from '@/lib/assetColors';

type BgMode = 'colored' | 'outline' | 'hidden';



// ─── Helpers ─────────────────────────────────────────────────────────────────
function engagementColor(score: number) {
  if (score >= 81) return '#22c55e';
  if (score >= 61) return '#3b82f6';
  if (score >= 31) return '#f59e0b';
  return '#ef4444';
}

function execRateColor(rate: number) {
  if (rate >= 70) return '#22c55e';
  if (rate >= 40) return '#f59e0b';
  return '#ef4444';
}

function statusDotColor(status: string) {
  const map: Record<string, string> = {
    realizada: '#22c55e', prevista: '#3b82f6', confirmada: '#3b82f6',
    em_andamento: '#f59e0b', atrasada: '#ef4444', cancelada: '#6b7280',
    pendente_validacao: '#a855f7',
  };
  return map[status] ?? '#6b7280';
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function WarKPICard({ label, value, sub, icon: Icon, gradientIndex, onClick }: {
  label: string; value: string | number; sub?: string;
  icon: any; gradientIndex: number; onClick?: () => void;
}) {
  const g = GRADIENT_CARDS[gradientIndex % GRADIENT_CARDS.length];
  return (
    <div
      className={`relative rounded-lg bg-card border border-border/60 p-5 overflow-hidden shadow-card transition-all ${onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-glow' : ''}`}
      onClick={onClick}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: g.accent }} />
      <div className="absolute top-3 right-3 opacity-30">
        <Icon className={`w-9 h-9 ${g.icon}`} />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const ALERT_LEVEL_CONFIG: Record<string, { bg: string; border: string; icon: string; accent: string }> = {
  critico:     { bg: 'hsl(220, 20%, 14%)', border: 'hsl(0, 60%, 35%)',   icon: '#E53935', accent: 'hsl(0, 50%, 25%)' },
  atencao:     { bg: 'hsl(220, 20%, 14%)', border: 'hsl(40, 60%, 35%)',  icon: '#FBC02D', accent: 'hsl(40, 40%, 22%)' },
  oportunidade:{ bg: 'hsl(220, 20%, 14%)', border: 'hsl(163, 60%, 30%)', icon: '#0FFCBE', accent: 'hsl(163, 40%, 18%)' },
  info:        { bg: 'hsl(220, 20%, 14%)', border: 'hsl(210, 50%, 35%)', icon: '#60a5fa', accent: 'hsl(210, 40%, 22%)' },
};

function SummaryPill({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-background/60 border border-border/60">
      {accent && <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function AlertCard({ alert, onRead, onResolve }: {
  alert: DbAlert;
  onRead?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  const c = ALERT_LEVEL_CONFIG[alert.level] ?? ALERT_LEVEL_CONFIG.info;
  const Icon = alert.level === 'critico' ? AlertTriangle : alert.level === 'oportunidade' ? Zap : Activity;
  return (
    <div
      className="rounded-lg p-3 mb-2 transition-all hover:scale-[1.01] cursor-pointer group"
      style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.icon}`, borderTop: 'none', borderRight: 'none', borderBottom: 'none' }}
      onClick={() => !alert.is_read && onRead?.(alert.id)}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.icon }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white/90 leading-tight">{alert.title}</div>
          <div className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{alert.description}</div>
          {alert.recommendation && (
            <div className="text-[10px] mt-1.5 font-medium line-clamp-1" style={{ color: c.icon }}>
              💡 {alert.recommendation}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-white/30 uppercase tracking-wide">{alert.status}</span>
            {alert.territory && <span className="text-[9px] text-white/30">· {alert.territory}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary" />}
          {alert.status !== 'resolvido' && (
            <button
              onClick={e => { e.stopPropagation(); onResolve?.(alert.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Marcar como resolvido"
            >
              <CheckCheck className="w-3.5 h-3.5 text-muted-foreground hover:text-brand-green" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalaDeGuerra() {
  const navigate = useNavigate();
  const { activeCandidate, activeCandidates } = useCandidate();
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useDashboardKPIs();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: macroStats = {} } = useMacroStats();
  const { data: macroRegionsDB = [] } = useMacroRegionsDB();
  const { data: actions = [] } = useActions();
  const { data: politicalAssets = [] } = usePoliticalAssets();
  const { data: teamMembers = [] } = useCampaignMembers();
  const { data: dbLeaders = [] } = useLeaders();
  const { data: dbSurveys } = useSurveys();
  const { data: strategicKPIs } = useStrategicKPIs();
  const markRead = useMarkAlertRead();
  const updateStatus = useUpdateAlertStatus();
  const generateAlerts = useGenerateAlerts();
  const { isAdmin } = useAuth();
  const { party: userParty, isPartyManager } = useUserParty();
  const { data: slates = [] } = useAllPartySlates();
  const canSeeChapas = isAdmin || isPartyManager;
  const activeCandidateIds = activeCandidates.map(c => c.id);
  const { data: unifiedAssets = [] } = useUnifiedPoliticalAssets();
  const geoAssets = unifiedAssets.filter(a => a.lat != null && a.lng != null);

  const chapasSummary = (() => {
    const filtered = isAdmin ? slates : slates.filter(r => r.party === userParty);
    return {
      total: filtered.length,
      fed: filtered.filter(r => r.cargo === 'Deputado Federal').length,
      est: filtered.filter(r => r.cargo === 'Deputado Estadual').length,
      pl: filtered.filter(r => r.party === 'PL').length,
      novo: filtered.filter(r => r.party === 'Novo').length,
    };
  })();

  // ── Tracking evolution data ──
  const trackingEvolutionQuery = useQuery({
    queryKey: ['tracking-evolution-war-room', activeCandidateIds],
    queryFn: async () => {
      if (activeCandidateIds.length === 0) return { chartData: [], candidateNames: [] };

      const results = await Promise.all(activeCandidateIds.map(async (candidateId) => {
        const { data, error } = await (supabase as any).rpc('get_tracking_evolution', {
          p_candidate_id: candidateId,
        });
        if (error || !data) return [];
        return data as any[];
      }));

      const data = results.flat();
      if (!data.length) return { chartData: [], candidateNames: [] };
      // data is array of { round_id, round_title, candidate, pct }
      const roundOrder: string[] = [];
      const roundMap: Record<string, Record<string, number>> = {};
      const roundTitles: Record<string, string> = {};
      const allNames = new Set<string>();
      (data as any[]).forEach((row: any) => {
        if (!roundMap[row.round_id]) {
          roundMap[row.round_id] = {};
          roundOrder.push(row.round_id);
          roundTitles[row.round_id] = (row.round_title || 'Rodada').slice(0, 18);
        }
        roundMap[row.round_id][row.candidate] = Number(row.pct);
        allNames.add(row.candidate);
      });
      const chartData = roundOrder.map(rid => ({
        round: roundTitles[rid],
        ...roundMap[rid],
      }));
      return { chartData, candidateNames: Array.from(allNames) };
    },
    enabled: activeCandidateIds.length > 0,
  });

  const trackingEvolution = trackingEvolutionQuery.data ?? { chartData: [], candidateNames: [] };

  const [mapView, setMapView] = useState<'operacional' | 'calor' | 'politico'>('operacional');
  const [bgMode, setBgMode] = useState<BgMode>('hidden');
  const [showAssetPins, setShowAssetPins] = useState(true);
  const [hiddenFamilies, setHiddenFamilies] = useState<Set<AssetFamily>>(new Set());
  const toggleFamily = (f: AssetFamily) =>
    setHiddenFamilies(prev => {
      const n = new Set(prev);
      n.has(f) ? n.delete(f) : n.add(f);
      return n;
    });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);


  // Auto-generate alerts on mount (once)
  useEffect(() => {
    generateAlerts.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchKPIs();
    await generateAlerts.mutateAsync();
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const completionRate = kpis?.completion_rate ?? 0;
  const totalActions = kpis?.total_actions ?? 0;
  const completedActions = kpis?.completed_actions ?? 0;
  const delayedActions = kpis?.delayed_actions ?? 0;
  const totalImpacted = kpis?.total_people_impacted ?? 0;
  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  // Build macro ranking from real stats
  const macroRanking = macroRegionsDB.map(r => {
    const s = macroStats[r.id] ?? { total: 0, done: 0, delayed: 0, people: 0 };
    const rate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
    return { ...r, execRate: rate, totalActions: s.total, doneActions: s.done, delayedActions: s.delayed };
  }).sort((a, b) => b.execRate - a.execRate);

  // ── Poll timeline derived from all available survey waves (DB + static seed) ──
  const EXCLUDED = ['Não sabe/ Não opinou', 'Nenhum/ Branco/ Nulo', 'Ninguém/ Branco/ Nulo', 'Poderia votar em todos', 'Não sabe/Não opinou'];

  // Converte "DD/MM/YYYY" ou "YYYY-MM-DD" para timestamp para ordenação cronológica correta
  const toTs = (d: string) => {
    if (!d) return 0;
    if (d.includes('/')) {
      const [dd, mm, yyyy] = d.split('/');
      return new Date(`${yyyy}-${mm}-${dd}`).getTime();
    }
    return new Date(d).getTime();
  };

  // Apenas pesquisas cadastradas na plataforma (sem seed estático)
  const allWaves: PollWave[] = [...(dbSurveys?.waves ?? [])]
    .sort((a, b) => toTs(a.releaseDate) - toTs(b.releaseDate));

  const allQuestions: PollQuestion[] = dbSurveys?.questions ?? [];

  // Normalize candidate name: strip trailing "(PARTY)" suffix so the same person
  // doesn't appear twice in the legend (e.g. "Sergio Moro" vs "Sergio Moro (PL)").
  const canonical = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Pick the best "Cenário 1 estimulada governador" result per wave → build chart rows
  const { pollChartData, topCandidates } = (() => {
    const waveRows: { label: string; values: Record<string, number> }[] = [];

    for (const wave of allWaves) {
      const q = allQuestions.find(
        q => q.waveId === wave.id && q.cargo === 'governador' && q.questionType === 'estimulada',
      );
      if (!q) continue;
      const row: Record<string, number> = {};
      q.results
        .filter(r => !EXCLUDED.some(ex => r.candidate.startsWith(ex.split('/')[0].trim())))
        .forEach(r => {
          const key = canonical(r.candidate);
          // If two variants of the same candidate appear in one wave, keep the larger value
          row[key] = Math.max(row[key] ?? 0, r.percentage);
        });
      waveRows.push({ label: wave.releaseDate, values: row });
    }

    const chartData = waveRows.map(({ label, values }) => ({ label, ...values }));

    // Top candidates by max percentage across all waves
    const totals: Record<string, number> = {};
    for (const row of chartData) {
      for (const [k, v] of Object.entries(row)) {
        if (k === 'label') continue;
        totals[k] = Math.max(totals[k] ?? 0, Number(v));
      }
    }
    const top = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return { pollChartData: chartData, topCandidates: top };
  })();

  const recentlyDone = actions.filter(a => a.status === 'realizada').slice(0, 5);

  // ── Real per-municipality metrics from platform data ──
  const normCity = (s: string | null | undefined) =>
    (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const muniMetrics = (() => {
    const map = new Map<string, { actions: number; done: number; delayed: number; assets: number; leaders: number; team: number; candidates: number; aligned: number; opposition: number; impacted: number }>();
    const ensure = (k: string) => {
      if (!map.has(k)) map.set(k, { actions: 0, done: 0, delayed: 0, assets: 0, leaders: 0, team: 0, candidates: 0, aligned: 0, opposition: 0, impacted: 0 });
      return map.get(k)!;
    };
    for (const a of actions) {
      const k = normCity(a.municipality);
      if (!k) continue;
      const m = ensure(k);
      m.actions += 1;
      if (a.status === 'realizada') m.done += 1;
      if (a.status === 'atrasada') m.delayed += 1;
      m.impacted += a.executed_people_count ?? 0;
    }
    for (const p of politicalAssets) {
      const k = normCity((p as any).municipality);
      if (!k) continue;
      const m = ensure(k);
      m.assets += 1;
      if ((p as any).alignment_status === 'alinhado' || (p as any).alignment_status === 'provavel') m.aligned += 1;
      if ((p as any).alignment_status === 'oposicao') m.opposition += 1;
    }
    for (const l of dbLeaders) {
      const k = normCity((l as any).municipality);
      if (!k) continue;
      const m = ensure(k);
      m.leaders += 1;
      if ((l as any).alignment_status === 'alinhado' || (l as any).alignment_status === 'provavel') m.aligned += 1;
      if ((l as any).alignment_status === 'oposicao') m.opposition += 1;
    }
    for (const tm of teamMembers) {
      const k = normCity((tm as any).municipality);
      if (!k) continue;
      ensure(k).team += 1;
    }
    for (const c of slates) {
      const k = normCity((c as any).city);
      if (!k) continue;
      ensure(k).candidates += 1;
    }
    return map;
  })();

  const maxActions = Math.max(1, ...Array.from(muniMetrics.values()).map(m => m.actions));
  const maxPresence = Math.max(1, ...Array.from(muniMetrics.values()).map(m => m.assets + m.leaders + m.team + m.candidates));

  const totalActionsMapped = actions.filter(a => a.municipality).length;
  const totalLeadership = politicalAssets.length + dbLeaders.length;


  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Crosshair className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Sala de Guerra</h1>
            <p className="text-xs text-muted-foreground">
              {activeCandidate
                ? `Campanha ${activeCandidate.cargo} — ${activeCandidate.name} · ${activeCandidate.party} · ${activeCandidate.state} ${activeCandidate.election_year}`
                : activeCandidates.length > 1
                  ? `Dashboard Executivo — Visão consolidada (${activeCandidates.length} candidatos)`
                  : 'Dashboard Executivo — Nenhum candidato ativo'}
            </p>
          </div>
          {activeCandidate ? (
            <div className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg border border-primary/30" style={{ background: 'hsl(var(--primary) / 0.06)' }}>
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {activeCandidate.photo_url
                  ? <img src={activeCandidate.photo_url} alt={activeCandidate.name} className="w-full h-full object-cover" />
                  : <User className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="text-xs font-semibold text-primary">{activeCandidate.name}</span>
            </div>
          ) : activeCandidates.length > 1 ? (
            <div className="flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg border border-primary/30" style={{ background: 'hsl(var(--primary) / 0.06)' }}>
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{activeCandidates.map(c => c.name).join(' + ')}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isRefreshing ? 'Atualizando...' : `Atualizado ${lastRefresh.toLocaleTimeString('pt-BR', { timeStyle: 'short' })}`}
            </span>
          </button>
          {totalActions > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-green/10 border border-brand-green/20">
              <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="text-xs font-semibold text-brand-green">AO VIVO</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* KPIs Row */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 animate-pulse bg-muted/30 h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <WarKPICard label="Ações Planejadas" value={totalActions} icon={Target} gradientIndex={0} onClick={() => navigate('/acoes')} />
            <WarKPICard label="Ações Realizadas" value={completedActions} sub={`${completionRate}% de execução`} icon={CheckCircle} gradientIndex={1} onClick={() => navigate('/acoes?status=realizada')} />
            <WarKPICard label="Ações Atrasadas" value={delayedActions} sub={totalActions > 0 ? `${Math.round((delayedActions / totalActions) * 100)}% do total` : undefined} icon={Clock} gradientIndex={5} onClick={() => navigate('/acoes?status=atrasada')} />
            <WarKPICard label="Em Andamento" value={kpis?.in_progress_actions ?? 0} icon={Activity} gradientIndex={4} onClick={() => navigate('/acoes?status=em_andamento')} />
            <WarKPICard label="Pessoas Impactadas" value={totalImpacted >= 1_000_000 ? `${(totalImpacted / 1_000_000).toFixed(2)}M` : totalImpacted >= 1_000 ? `${(totalImpacted / 1_000).toFixed(1)}K` : totalImpacted} icon={Users} gradientIndex={3} onClick={() => navigate('/campo')} />
            <WarKPICard label="Pendentes Validação" value={kpis?.pending_validation ?? 0} icon={Bell} gradientIndex={2} onClick={() => navigate('/acoes?status=pendente_validacao')} />
            <WarKPICard label="Ativos Políticos" value={unifiedAssets.length} sub={`${geoAssets.length} geolocalizados`} icon={Users} gradientIndex={6} onClick={() => navigate('/ativos-politicos')} />
          </div>

        )}

        {/* Chapas Proporcionais — resumo */}
        {canSeeChapas && chapasSummary.total > 0 && (
          <button
            type="button"
            onClick={() => navigate('/chapas')}
            className="w-full text-left rounded-lg border border-border/60 bg-card hover:border-primary/60 hover:shadow-glow transition-all p-4 group"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Chapas Proporcionais</div>
                  <div className="text-sm font-bold">Pré-candidatos a Deputado</div>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                <SummaryPill label="Total" value={chapasSummary.total} />
                <SummaryPill label="Federal" value={chapasSummary.fed} />
                <SummaryPill label="Estadual" value={chapasSummary.est} />
                {isAdmin && <SummaryPill label="PL" value={chapasSummary.pl} accent="#1F5AB4" />}
                {isAdmin && <SummaryPill label="Novo" value={chapasSummary.novo} accent="#F97316" />}
                <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        )}



        {/* Main Grid: Map + Alerts */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          {/* Map */}
          <div className="rounded-xl border border-border overflow-hidden" style={{ minHeight: 420 }}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/50 flex-wrap gap-2">
              <span className="text-sm font-semibold text-foreground">Mapa Interativo — Paraná</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1">
                  {(['calor', 'operacional', 'politico'] as const).map(view => (
                    <button
                      key={view}
                      onClick={() => setMapView(view)}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${mapView === view ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                    >
                      {view === 'calor' ? 'Calor' : view === 'operacional' ? 'Operacional' : 'Político'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/40 border border-border">
                  {([
                    { id: 'colored' as BgMode, label: 'Cores' },
                    { id: 'outline' as BgMode, label: 'Contornos' },
                    { id: 'hidden' as BgMode, label: 'Oculto' },
                  ]).map(o => (
                    <button
                      key={o.id}
                      onClick={() => setBgMode(o.id)}
                      className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${bgMode === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={showAssetPins} onChange={() => setShowAssetPins(v => !v)} className="accent-primary" />
                  Pins ativos
                </label>
                <button
                  onClick={() => navigate('/mapa')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium bg-muted text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Expandir
                </button>
              </div>
            </div>
            <div className="relative" style={{ height: 380, background: bgMode === 'outline' ? '#ffffff' : undefined }}>
              <MapContainer center={[-24.7, -51.5]} zoom={7} style={{ height: '100%', width: '100%', background: bgMode === 'outline' ? '#ffffff' : undefined }} zoomControl={false}>
                {bgMode !== 'outline' && (
                  <TileLayer
                    url={bgMode === 'colored'
                      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
                    attribution='&copy; <a href="https://carto.com">CARTO</a>'
                    opacity={bgMode === 'colored' ? 0.35 : 1}
                  />
                )}
                {bgMode === 'colored' && <PrAssociationChoropleth />}
                {bgMode === 'outline' && (
                  <PrAssociationChoropleth fillOpacity={0} strokeColor="#94a3b8" strokeWeight={0.5} />
                )}

                {/* Municipality circles — colored by REAL platform data */}
                {municipalities.map(muni => {
                  const m = muniMetrics.get(normCity(muni.name));
                  const acts = m?.actions ?? 0;
                  const done = m?.done ?? 0;
                  const assets = m?.assets ?? 0;
                  const leadersCount = m?.leaders ?? 0;
                  const team = m?.team ?? 0;
                  const cands = m?.candidates ?? 0;
                  const aligned = m?.aligned ?? 0;
                  const opposition = m?.opposition ?? 0;
                  const presence = assets + leadersCount + team + cands;
                  const execRate = acts > 0 ? (done / acts) * 100 : 0;
                  const engagement = Math.round(
                    Math.min(100, (acts / maxActions) * 50 + (presence / maxPresence) * 50)
                  );
                  const alignedTotal = aligned + opposition;
                  const alignedPct = alignedTotal > 0 ? (aligned / alignedTotal) * 100 : 0;

                  const hasOps = acts > 0;
                  const hasPol = assets + leadersCount + cands > 0;
                  const hasEng = acts > 0 || presence > 0;

                  const color = mapView === 'calor'
                    ? (hasEng ? engagementColor(engagement) : '#475569')
                    : mapView === 'operacional'
                    ? (hasOps ? execRateColor(execRate) : '#475569')
                    : (hasPol
                        ? (alignedTotal > 0
                            ? (alignedPct >= 60 ? '#22c55e' : alignedPct >= 40 ? '#f59e0b' : '#ef4444')
                            : '#3b82f6')
                        : '#475569');

                  const radiusBase = mapView === 'operacional'
                    ? acts
                    : mapView === 'politico'
                    ? assets + leadersCount + cands
                    : acts + presence;
                  const radius = radiusBase > 0
                    ? Math.max(6, Math.min(22, 6 + radiusBase * 0.6))
                    : 4;

                  return (
                    <CircleMarker
                      key={muni.id}
                      center={[muni.lat, muni.lng]}
                      radius={radius}
                      fillColor={color}
                      color={color}
                      weight={1.5}
                      opacity={hasEng ? 0.9 : 0.4}
                      fillOpacity={hasEng ? 0.7 : 0.25}
                    >
                      <Tooltip>
                        <div style={{ color: '#1e293b', minWidth: 170 }}>
                          <strong>{muni.name}</strong><br />
                          Ações: {acts} ({done} realizadas){acts > 0 ? ` · ${Math.round(execRate)}%` : ''}<br />
                          Lideranças/Ativos: {assets + leadersCount}{alignedTotal > 0 ? ` (${Math.round(alignedPct)}% alinhados)` : ''}<br />
                          Equipe: {team} · Pré-candidatos: {cands}<br />
                          Engajamento: {engagement}/100
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
                {/* Real action pins from DB */}
                {mapView === 'operacional' && actions.filter(a => a.lat && a.lng).map(action => (
                  <CircleMarker
                    key={action.id}
                    center={[action.lat!, action.lng!]}
                    radius={7}
                    fillColor={statusDotColor(action.status)}
                    color="#ffffff"
                    weight={2}
                    fillOpacity={0.95}
                  >
                    <Popup>
                      <div style={{ color: '#1e293b', minWidth: 180 }}>
                        <strong className="text-sm">{action.title}</strong><br />
                        <span className="text-xs">Status: {action.status}</span><br />
                        <span className="text-xs">📅 {action.planned_date}</span><br />
                        {action.responsible && <span className="text-xs">👤 {action.responsible}</span>}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                {/* Unified political asset pins — colored by TYPE/FAMILY */}
                {showAssetPins && geoAssets.map(a => {
                  const meta = typeMeta(a.type);
                  if (hiddenFamilies.has(meta.family)) return null;
                  return (
                    <CircleMarker
                      key={`ua-${a.origin}-${a.id}`}
                      center={[a.lat!, a.lng!]}
                      radius={5}
                      fillColor={meta.color}
                      color={bgMode === 'outline' ? '#1a2a45' : '#ffffff'}
                      weight={1}
                      fillOpacity={0.9}
                    >
                      <Tooltip>
                        <div style={{ color: '#1e293b', minWidth: 160 }}>
                          <strong>{a.name}</strong><br />
                          <span style={{ fontSize: 11 }}>{meta.label} · {a.source_label}</span><br />
                          {a.municipality && <span style={{ fontSize: 11 }}>📍 {a.municipality}</span>}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
                <MapZoomControl />

              </MapContainer>
            </div>
            {/* Legend */}
            <div className="px-4 py-2 border-t border-border bg-card/30 flex flex-wrap gap-3">
              {mapView === 'operacional' && [
                { color: '#22c55e', label: 'Realizada' },
                { color: '#3b82f6', label: 'Prevista/Confirmada' },
                { color: '#f59e0b', label: 'Em Andamento' },
                { color: '#ef4444', label: 'Atrasada' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
              {mapView === 'calor' && [
                { color: '#22c55e', label: 'Consolidado (81-100)' },
                { color: '#3b82f6', label: 'Competitivo (61-80)' },
                { color: '#f59e0b', label: 'Atenção (31-60)' },
                { color: '#ef4444', label: 'Risco (0-30)' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
              {mapView === 'politico' && [
                { color: '#22c55e', label: 'Alinhados ≥60%' },
                { color: '#f59e0b', label: 'Disputado 40-59%' },
                { color: '#ef4444', label: 'Oposição <40%' },
                { color: '#3b82f6', label: 'Presença (chapa/equipe)' },
                { color: '#475569', label: 'Sem dados' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
              {showAssetPins && (() => {
                // Conta ativos por tipo e agrupa por família
                const counts = new Map<string, number>();
                geoAssets.forEach(a => counts.set(a.type as string, (counts.get(a.type as string) ?? 0) + 1));
                const presentTypes = Array.from(counts.entries())
                  .map(([t, n]) => ({ t, n, meta: typeMeta(t) }))
                  .sort((a, b) => b.n - a.n);
                const byFamily = new Map<AssetFamily, typeof presentTypes>();
                presentTypes.forEach(item => {
                  const arr = byFamily.get(item.meta.family) ?? [];
                  arr.push(item);
                  byFamily.set(item.meta.family, arr);
                });
                return (
                  <div className="w-full flex flex-wrap gap-x-4 gap-y-2">
                    {(Array.from(byFamily.entries())).map(([fam, items]) => {
                      const hidden = hiddenFamilies.has(fam);
                      return (
                        <div key={fam} className="flex flex-col gap-1">
                          <button
                            onClick={() => toggleFamily(fam)}
                            className={`text-[10px] font-semibold uppercase tracking-wide transition-colors ${hidden ? 'text-muted-foreground/40 line-through' : 'text-foreground'}`}
                            title={hidden ? 'Mostrar' : 'Ocultar'}
                          >
                            {FAMILY_META[fam].label}
                          </button>
                          <div className={`flex flex-wrap gap-x-2 gap-y-1 ${hidden ? 'opacity-30' : ''}`}>
                            {items.map(({ t, n, meta }) => (
                              <div key={t} className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ backgroundColor: meta.color }} />
                                <span className="text-[10px] text-muted-foreground">{meta.label} · {n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {totalActionsMapped} ações · {totalLeadership} lideranças · {teamMembers.length} equipe · {slates.length} pré-candidatos · {geoAssets.length} ativos
              </span>

            </div>
          </div>

          {/* Alerts Panel */}
          <div className="rounded-xl bg-[hsl(220,20%,13%)] border border-[hsl(220,15%,20%)] shadow-lg flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-brand-amber" />
              <span className="text-sm font-semibold text-foreground">Alertas Estratégicos</span>
              {unreadAlerts > 0 && (
                <span className="text-[10px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-full font-bold">
                  {unreadAlerts} novos
                </span>
              )}
              <button
                onClick={() => navigate('/alertas')}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Ver todos <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 flex-1 overflow-auto" style={{ maxHeight: 380 }}>
              {alertsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhum alerta ativo.</p>
                  <button onClick={handleRefresh} className="mt-2 text-xs text-primary hover:underline">Gerar alertas</button>
                </div>
              ) : (
                alerts.slice(0, 8).map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onRead={id => markRead.mutate(id)}
                    onResolve={id => updateStatus.mutate({ id, status: 'resolvido', resolution_note: 'Resolvido via Sala de Guerra.' })}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Crisis Card */}
        {(strategicKPIs?.active ?? 0) > 0 && (
          <div
            className="rounded-xl border p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.005] transition-all"
            style={{ background: 'hsl(var(--brand-red) / 0.07)', borderColor: 'hsl(var(--brand-red) / 0.3)' }}
            onClick={() => navigate('/sala-de-crise')}
          >
            <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: 'hsl(var(--brand-red) / 0.15)' }}>
              <ShieldAlert className="w-5 h-5 text-brand-red" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-foreground">Sala de Crise — IA Estratégica</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
                  {strategicKPIs.critical} CRÍTICO{strategicKPIs.critical !== 1 ? 'S' : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {strategicKPIs.active} alertas estratégicos ativos · {strategicKPIs.opportunities} oportunidades identificadas
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 flex-shrink-0 hidden lg:grid">
              <div className="text-center">
                <div className="text-xl font-black text-red-400">{strategicKPIs.active}</div>
                <div className="text-[10px] text-muted-foreground">Alertas</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-red-400">{strategicKPIs.riskIndex}</div>
                <div className="text-[10px] text-muted-foreground">Risco</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-brand-green">{strategicKPIs.opportunityIndex}</div>
                <div className="text-[10px] text-muted-foreground">Opp.</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
          </div>
        )}

        {/* Bottom Grid */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="">
            <div className="flex items-center gap-2 -mt-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#0FFCBE]" />
              <span className="text-sm font-semibold text-white/90">Evolução das Pesquisas</span>
              <span className="text-[10px] text-[#8899aa] font-medium">
                Gov · Estimulada C1 · {allWaves.length} onda{allWaves.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => navigate('/pesquisas')}
                className="ml-auto flex items-center gap-1 text-xs text-[#8899aa] hover:text-[#0FFCBE] transition-colors font-medium"
              >
                Explorar <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            {pollChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-xs text-muted-foreground">
                Nenhuma pesquisa com dados de governador cadastrada.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={pollChartData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8899aa' }} interval={0} angle={-10} textAnchor="end" height={36} />
                  <YAxis domain={[0, 60]} tick={AXIS_TICK_LIGHT} tickFormatter={v => `${v}%`} width={32} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {topCandidates.map((candidate, i) => (
                    <Line
                      key={candidate}
                      type="monotone"
                      dataKey={candidate}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={i === 0 ? 2.5 : 1.5}
                      strokeDasharray={i === 0 ? undefined : '4 2'}
                      dot={{ r: i === 0 ? 4 : 2.5, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Tracking Evolution Card */}
          <ChartCard title="">
            <div className="flex items-center gap-2 -mt-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[#0FFCBE]" />
              <span className="text-sm font-semibold text-white/90">Evolução do Tracking</span>
              <span className="text-[10px] text-[#8899aa] font-medium">
                {trackingEvolution.chartData.length} rodada{trackingEvolution.chartData.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => navigate('/tracking')}
                className="ml-auto flex items-center gap-1 text-xs text-[#8899aa] hover:text-[#0FFCBE] transition-colors font-medium"
              >
                Explorar <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            {trackingEvolution.chartData.length < 2 ? (
              <div className="flex items-center justify-center h-[160px] text-xs text-muted-foreground">
                Necessário ao menos 2 rodadas com dados para exibir evolução.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trackingEvolution.chartData} margin={{ left: 0, right: 8 }}>
                  <defs>
                    {trackingEvolution.candidateNames.map((name, i) => {
                      const color = CHART_COLORS[i % CHART_COLORS.length];
                      return (
                        <linearGradient key={name} id={`tracking-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="round" tick={{ fontSize: 9, fill: '#8899aa' }} />
                  <YAxis domain={[0, 'auto']} tick={AXIS_TICK_LIGHT} tickFormatter={v => `${v}%`} width={32} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {trackingEvolution.candidateNames.map((name, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={color}
                        fill={`url(#tracking-grad-${i})`}
                        strokeWidth={2}
                        dot={{ r: 3, fill: color }}
                        connectNulls
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="">
            <div className="flex items-center gap-2 -mt-2 mb-4">
              <Activity className="w-4 h-4 text-[#0FFCBE]" />
              <span className="text-sm font-semibold text-white/90">Ranking Macrorregiões</span>
              <button
                onClick={() => navigate('/territorios')}
                className="ml-auto flex items-center gap-1 text-xs text-[#8899aa] hover:text-[#0FFCBE] transition-colors font-medium"
              >
                Explorar <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            {macroRanking.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">Cadastre ações para ver o ranking.</div>
            ) : (
              <div className="space-y-2">
                {macroRanking.map((r, i) => {
                  const color = execRateColor(r.execRate);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg px-1 py-0.5 transition-colors"
                      onClick={() => navigate(`/territorios`)}
                    >
                      <span className="text-xs font-bold text-[#8899aa] w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-white/90 truncate">{r.name}</span>
                          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>
                            {r.execRate}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${r.execRate}%`, backgroundColor: color }} />
                        </div>
                        <div className="text-[10px] text-[#8899aa] mt-0.5">
                          {r.doneActions}/{r.totalActions} ações · {r.delayedActions} atrasadas
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          <ChartCard title="">
            <div className="flex items-center gap-2 -mt-2 mb-4">
              <CheckCircle className="w-4 h-4 text-[#0FFCBE]" />
              <span className="text-sm font-semibold text-white/90">Últimas Ações Realizadas</span>
              <button
                onClick={() => navigate('/acoes?status=realizada')}
                className="ml-auto flex items-center gap-1 text-xs text-[#8899aa] hover:text-[#0FFCBE] transition-colors font-medium"
              >
                Ver todas <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            {recentlyDone.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">Nenhuma ação realizada ainda.</div>
            ) : (
              <div className="space-y-2">
                {recentlyDone.map(action => (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => navigate('/acoes?status=realizada')}
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#0FFCBE]" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white/90 leading-tight truncate">{action.title}</div>
                      <div className="text-[10px] text-[#8899aa]">
                        {action.municipality ?? '—'}
                        {action.executed_people_count ? ` · ${action.executed_people_count.toLocaleString()} impactados` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
