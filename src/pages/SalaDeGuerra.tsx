import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import {
  Crosshair, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Users, Activity, Zap, Target,
  RefreshCw, Bell, CheckCheck,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import { municipalities } from '@/data/mockData';
import {
  pollWaves, pollQuestions, CANDIDATE_COLORS,
  type PollWave, type PollQuestion,
} from '@/data/pollsData';
import { useSurveys } from '@/hooks/useSurveys';
import { useDashboardKPIs, useAlerts, useMacroStats, useMacroRegionsDB, useMarkAlertRead, useUpdateAlertStatus, useGenerateAlerts } from '@/hooks/useDashboard';
import { useActions } from '@/hooks/useActions';
import type { DbAlert } from '@/types/database';

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
function KPICard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: number;
}) {
  return (
    <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${trend > 0 ? 'text-brand-green' : trend < 0 ? 'text-brand-red' : 'text-muted-foreground'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-foreground/60 mt-1 font-medium">{sub}</div>}
    </div>
  );
}

const ALERT_LEVEL_CONFIG: Record<string, { bg: string; border: string; icon: string }> = {
  critico:     { bg: 'hsl(var(--brand-red) / 0.1)',   border: 'hsl(var(--brand-red) / 0.3)',   icon: 'hsl(var(--brand-red))' },
  atencao:     { bg: 'hsl(var(--brand-amber) / 0.1)', border: 'hsl(var(--brand-amber) / 0.3)', icon: 'hsl(var(--brand-amber))' },
  oportunidade:{ bg: 'hsl(var(--brand-green) / 0.1)', border: 'hsl(var(--brand-green) / 0.3)', icon: 'hsl(var(--brand-green))' },
  info:        { bg: 'hsl(var(--primary) / 0.1)',     border: 'hsl(var(--primary) / 0.3)',     icon: 'hsl(var(--primary))' },
};

function AlertCard({ alert, onRead, onResolve }: {
  alert: DbAlert;
  onRead?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  const c = ALERT_LEVEL_CONFIG[alert.level] ?? ALERT_LEVEL_CONFIG.info;
  const Icon = alert.level === 'critico' ? AlertTriangle : alert.level === 'oportunidade' ? Zap : Activity;
  return (
    <div
      className="rounded-lg p-3 border mb-2 transition-all hover:scale-[1.01] cursor-pointer group"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
      onClick={() => !alert.is_read && onRead?.(alert.id)}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.icon }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-foreground leading-tight">{alert.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</div>
          {alert.recommendation && (
            <div className="text-[10px] mt-1.5 font-medium line-clamp-1" style={{ color: c.icon }}>
              💡 {alert.recommendation}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wide">{alert.status}</span>
            {alert.territory && <span className="text-[9px] text-muted-foreground/60">· {alert.territory}</span>}
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
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKPIs } = useDashboardKPIs();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: macroStats = {} } = useMacroStats();
  const { data: macroRegionsDB = [] } = useMacroRegionsDB();
  const { data: actions = [] } = useActions();
  const { data: dbSurveys } = useSurveys();
  const markRead = useMarkAlertRead();
  const updateStatus = useUpdateAlertStatus();
  const generateAlerts = useGenerateAlerts();

  const [mapView, setMapView] = useState<'operacional' | 'calor' | 'politico'>('operacional');
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

  const allWaves: PollWave[] = [
    ...(dbSurveys?.waves ?? []),
    ...pollWaves.filter(w => !(dbSurveys?.waves ?? []).some(dw => dw.id === w.id)),
  ].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  const allQuestions: PollQuestion[] = [
    ...(dbSurveys?.questions ?? []),
    ...pollQuestions.filter(q => !(dbSurveys?.questions ?? []).some(dq => dq.id === q.id)),
  ];

  // Pick the best "Cenário 1 estimulada governador" result per wave → build chart rows
  const pollChartData = (() => {
    // Collect all candidates that appear across waves (excluding structural ones)
    const candidateSet = new Set<string>();
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
          row[r.candidate] = r.percentage;
          candidateSet.add(r.candidate);
        });
      waveRows.push({ label: wave.releaseDate, values: row });
    }

    // Build final chart rows: { label, [candidateName]: pct, ... }
    return waveRows.map(({ label, values }) => ({ label, ...values }));
  })();

  // Top candidates by max percentage across all waves (for lines)
  const topCandidates = (() => {
    const totals: Record<string, number> = {};
    for (const row of pollChartData) {
      for (const [k, v] of Object.entries(row)) {
        if (k === 'label') continue;
        totals[k] = Math.max(totals[k] ?? 0, Number(v));
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  })();

  const recentlyDone = actions.filter(a => a.status === 'realizada').slice(0, 5);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Crosshair className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Sala de Guerra</h1>
            <p className="text-xs text-muted-foreground">Dashboard Executivo — Campanha Governador do Paraná 2026</p>
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 animate-pulse bg-muted/30 h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="Ações Planejadas"
              value={totalActions}
              icon={Target}
              color="hsl(var(--primary))"
            />
            <KPICard
              label="Ações Realizadas"
              value={completedActions}
              sub={`${completionRate}% de execução`}
              icon={CheckCircle}
              color="hsl(var(--brand-green))"
            />
            <KPICard
              label="Ações Atrasadas"
              value={delayedActions}
              sub={totalActions > 0 ? `${Math.round((delayedActions / totalActions) * 100)}% do total` : undefined}
              icon={Clock}
              color="hsl(var(--brand-red))"
            />
            <KPICard
              label="Em Andamento"
              value={kpis?.in_progress_actions ?? 0}
              icon={Activity}
              color="hsl(var(--brand-amber))"
            />
            <KPICard
              label="Pessoas Impactadas"
              value={totalImpacted >= 1_000_000
                ? `${(totalImpacted / 1_000_000).toFixed(2)}M`
                : totalImpacted >= 1_000
                ? `${(totalImpacted / 1_000).toFixed(1)}K`
                : totalImpacted}
              icon={Users}
              color="hsl(var(--brand-cyan))"
            />
            <KPICard
              label="Pendentes Validação"
              value={kpis?.pending_validation ?? 0}
              icon={Bell}
              color="hsl(var(--primary))"
            />
          </div>
        )}

        {/* Main Grid: Map + Alerts */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          {/* Map */}
          <div className="rounded-xl border border-border overflow-hidden" style={{ minHeight: 420 }}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/50">
              <span className="text-sm font-semibold text-foreground">Mapa Interativo — Paraná</span>
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
            </div>
            <div style={{ height: 380 }}>
              <MapContainer center={[-24.7, -51.5]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                />
                {/* Municipality base circles */}
                {municipalities.map(muni => {
                  const s = macroStats[muni.macroregion] ?? { total: 0, done: 0 };
                  const rate = s.total > 0 ? (s.done / s.total) * 100 : 50;
                  const color = mapView === 'calor'
                    ? engagementColor(muni.engagementScore)
                    : mapView === 'operacional'
                    ? execRateColor(rate)
                    : (muni.pollScore && muni.pollScore > 45 ? '#22c55e' : muni.pollScore && muni.pollScore > 40 ? '#f59e0b' : '#ef4444');
                  const radius = Math.max(8, muni.engagementScore * 0.18);
                  return (
                    <CircleMarker
                      key={muni.id}
                      center={[muni.lat, muni.lng]}
                      radius={radius}
                      fillColor={color}
                      color={color}
                      weight={1.5}
                      opacity={0.9}
                      fillOpacity={0.7}
                    >
                      <Tooltip>
                        <div style={{ color: '#1e293b', minWidth: 140 }}>
                          <strong>{muni.name}</strong><br />
                          Engajamento: {muni.engagementScore}/100<br />
                          {muni.pollScore && `Pesquisa: ${muni.pollScore}%`}
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
              <span className="ml-auto text-[10px] text-muted-foreground">
                {actions.filter(a => a.lat && a.lng).length} ações no mapa
              </span>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="rounded-xl border border-border flex flex-col" style={{ background: 'var(--gradient-card)' }}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-brand-amber" />
              <span className="text-sm font-semibold text-foreground">Alertas Estratégicos</span>
              {unreadAlerts > 0 && (
                <span className="ml-auto text-[10px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-full font-bold">
                  {unreadAlerts} novos
                </span>
              )}
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
                    onResolve={id => updateStatus.mutate({ id, status: 'resolvido' })}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid lg:grid-cols-[1fr_1fr_300px] gap-4">
          {/* Poll Chart — derived from real survey waves */}
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Evolução das Pesquisas</span>
              <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                Gov · Estimulada C1 · {allWaves.length} onda{allWaves.length !== 1 ? 's' : ''}
              </span>
            </div>
            {pollChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-xs text-muted-foreground">
                Nenhuma pesquisa com dados de governador cadastrada.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={pollChartData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-10} textAnchor="end" height={36} />
                  <YAxis domain={[0, 60]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} width={32} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${v}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {topCandidates.map((candidate, i) => (
                    <Line
                      key={candidate}
                      type="monotone"
                      dataKey={candidate}
                      stroke={CANDIDATE_COLORS[candidate] ?? 'hsl(var(--primary))'}
                      strokeWidth={i === 0 ? 2.5 : 1.5}
                      strokeDasharray={i === 0 ? undefined : '4 2'}
                      dot={{ r: i === 0 ? 4 : 2.5, fill: CANDIDATE_COLORS[candidate] ?? 'hsl(var(--primary))' }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Macro Ranking — real data */}
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-brand-cyan" />
              <span className="text-sm font-semibold text-foreground">Ranking Macrorregiões</span>
              <span className="text-[10px] text-muted-foreground ml-auto">por execução</span>
            </div>
            {macroRanking.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">Cadastre ações para ver o ranking.</div>
            ) : (
              <div className="space-y-2">
                {macroRanking.map((r, i) => {
                  const color = execRateColor(r.execRate);
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-foreground truncate">{r.name}</span>
                          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>
                            {r.execRate}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${r.execRate}%`, backgroundColor: color }} />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {r.doneActions}/{r.totalActions} ações · {r.delayedActions} atrasadas
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Completed Actions */}
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-brand-green" />
              <span className="text-sm font-semibold text-foreground">Últimas Ações Realizadas</span>
            </div>
            {recentlyDone.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">Nenhuma ação realizada ainda.</div>
            ) : (
              <div className="space-y-2">
                {recentlyDone.map(action => (
                  <div key={action.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-brand-green" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground leading-tight truncate">{action.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {action.municipality ?? '—'}
                        {action.executed_people_count ? ` · ${action.executed_people_count.toLocaleString()} impactados` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
