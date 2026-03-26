import { useState, useMemo } from 'react';
import {
  ShieldAlert, Zap, AlertTriangle, Activity, TrendingUp, TrendingDown,
  Search, Filter, RefreshCw, CheckCheck, Eye, X, MapPin, Clock,
  Brain, ChevronRight, BarChart2, Flame, ClipboardList, Bell,
  CheckCircle, Trophy, AlertOctagon, ChevronDown, ChevronUp, Minus, Info,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  useStrategicAlerts, useStrategicKPIs, useRunStrategicAnalysis,
  useUpdateStrategicAlert, useMarkStrategicAlertRead,
  ALERT_TYPE_CONFIG, type StrategicAlert, type StrategicAlertType, type StrategicAlertStatus,
} from '@/hooks/useStrategicAlerts';
import { useMacroRegionsDB, useAlerts, useMarkAlertRead, useUpdateAlertStatus, useGenerateAlerts } from '@/hooks/useDashboard';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import { ResponsibleChain } from '@/components/alerts/ResponsibleChain';
import { resolveAlertTeam } from '@/lib/alertTeam';
import { InfographicHBar, InfographicVBar } from '@/components/ui/InfographicCharts';
import type { DbAlert } from '@/types/database';

// ══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════

function SeverityBar({ value }: { value: number }) {
  const color = value >= 8 ? '#E53935' : value >= 6 ? '#FBC02D' : value >= 4 ? '#106EBE' : '#43A047';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{value}/10</span>
    </div>
  );
}

function IndexBadge({ value, label, variant }: { value: number; label: string; variant: 'risk' | 'opportunity' }) {
  const color = variant === 'risk'
    ? (value >= 70 ? '#E53935' : value >= 40 ? '#FBC02D' : '#43A047')
    : (value >= 60 ? '#43A047' : value >= 30 ? '#106EBE' : '#94a3b8');
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
      {variant === 'risk' ? <TrendingDown className="w-3 h-3" style={{ color }} /> : <TrendingUp className="w-3 h-3" style={{ color }} />}
      <span className="text-[10px] font-semibold" style={{ color }}>{label}: {value}</span>
    </div>
  );
}

// ── Resolution Dialog (shared) ────────────────────────────────
function ResolutionDialog({ open, onClose, onConfirm, targetStatus }: {
  open: boolean; onClose: () => void; onConfirm: (note: string) => void; targetStatus: string;
}) {
  const [note, setNote] = useState('');
  const isResolve = targetStatus === 'resolvido' || targetStatus === 'descartado';
  const handleSubmit = () => { if (!note.trim()) return; onConfirm(note.trim()); setNote(''); };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            {isResolve ? 'Registrar Encerramento' : 'Registrar Ação Planejada'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isResolve
              ? 'Descreva obrigatoriamente qual ação foi realizada para resolver este alerta.'
              : 'Descreva obrigatoriamente qual ação foi planejada para tratar este alerta.'}
          </p>
          <Textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder={isResolve ? 'Ex: Mobilização realizada, liderança contatada...' : 'Ex: Reunião estratégica marcada para esta semana...'}
            className="min-h-[120px] resize-none" />
          {note.trim().length === 0 && <p className="text-xs text-destructive">* Campo obrigatório.</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!note.trim()} onClick={handleSubmit}>
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — IA ESTRATÉGICA (strategic_alerts)
// ══════════════════════════════════════════════════════════════

function AlertDetailPanel({ alert, onClose, onUpdate, members }: {
  alert: StrategicAlert; onClose: () => void;
  onUpdate: (id: string, status: StrategicAlertStatus) => void;
  members: import('@/types/database').DbCampaignMember[];
}) {
  const cfg = ALERT_TYPE_CONFIG[alert.type];
  const TypeIcon = alert.type === 'oportunidade_estrategica' ? Zap : alert.type === 'risco_eleitoral' ? BarChart2 : alert.type === 'ineficiencia_atuacao' ? Activity : AlertTriangle;
  const team = resolveAlertTeam(members, { macroregion_id: alert.macroregion_id, microregion: alert.microregion, municipality: alert.municipality, creatorName: alert.responsible_name ?? undefined, creatorRole: alert.responsible_role ?? undefined });
  return (
    <div className="h-full flex flex-col rounded-xl border overflow-hidden" style={{ background: 'var(--gradient-card)', borderColor: cfg.border }}>
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-shrink-0" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: `${cfg.color}20` }}>
            <TypeIcon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge} mb-1.5 inline-block`}>{cfg.label}</span>
            <h3 className="text-sm font-bold text-foreground leading-tight">{alert.title}</h3>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {alert.territory && <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg"><MapPin className="w-3.5 h-3.5" />{alert.territory}</div>}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg"><Clock className="w-3.5 h-3.5" />{new Date(alert.created_at).toLocaleString('pt-BR')}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg"><Flame className="w-3.5 h-3.5" />Severidade {alert.severity}/10</div>
        </div>
        {team.length > 0 && <div className="rounded-xl border border-border p-4 bg-muted/20"><ResponsibleChain entries={team} /></div>}
        <div className="grid grid-cols-2 gap-3">
          {alert.risk_index !== null && (
            <div className="rounded-lg p-3 bg-muted/40 border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Índice de Risco</div>
              <div className="text-2xl font-black text-destructive">{alert.risk_index?.toFixed(0)}</div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1"><div className="h-full rounded-full bg-destructive" style={{ width: `${alert.risk_index}%` }} /></div>
            </div>
          )}
          {alert.opportunity_index !== null && (
            <div className="rounded-lg p-3 bg-muted/40 border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Índice de Oportunidade</div>
              <div className="text-2xl font-black text-brand-green">{alert.opportunity_index?.toFixed(0)}</div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1"><div className="h-full rounded-full bg-brand-green" style={{ width: `${alert.opportunity_index}%` }} /></div>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Análise</div>
          <p className="text-sm text-foreground leading-relaxed">{alert.description}</p>
        </div>
        {alert.recommendation && (
          <div className="rounded-xl border p-4" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4" style={{ color: cfg.color }} /><span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>Recomendação IA</span></div>
            <p className="text-sm text-foreground leading-relaxed">{alert.recommendation}</p>
          </div>
        )}
        {alert.source_data && Object.keys(alert.source_data).length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dados de Origem</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(alert.source_data).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-muted/40 text-xs">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-foreground">{typeof v === 'number' ? (Number.isInteger(v) ? v : (v as number).toFixed(1)) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-5 py-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: cfg.border }}>
        {alert.status === 'ativo' && <button onClick={() => onUpdate(alert.id, 'em_analise')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Eye className="w-3.5 h-3.5" />Em Análise</button>}
        {alert.status !== 'resolvido' && <button onClick={() => onUpdate(alert.id, 'resolvido')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary-foreground transition-colors ml-auto" style={{ background: 'var(--gradient-primary)' }}><CheckCheck className="w-3.5 h-3.5" />Marcar Resolvido</button>}
        {alert.status !== 'descartado' && <button onClick={() => onUpdate(alert.id, 'descartado')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" />Descartar</button>}
      </div>
    </div>
  );
}

function StrategicAlertCard({ alert, onSelect, isSelected, onUpdate, members }: {
  alert: StrategicAlert; onSelect: (a: StrategicAlert) => void; isSelected: boolean;
  onUpdate: (id: string, status: StrategicAlertStatus) => void;
  members: import('@/types/database').DbCampaignMember[];
}) {
  const cfg = ALERT_TYPE_CONFIG[alert.type];
  const TypeIcon = alert.type === 'oportunidade_estrategica' ? Zap : alert.type === 'risco_eleitoral' ? BarChart2 : alert.type === 'ineficiencia_atuacao' ? Activity : AlertTriangle;
  const team = resolveAlertTeam(members, { macroregion_id: alert.macroregion_id, microregion: alert.microregion, municipality: alert.municipality });
  return (
    <div onClick={() => onSelect(alert)} className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] group ${isSelected ? 'ring-2 ring-primary/50' : ''}`} style={{ backgroundColor: cfg.bg, borderColor: isSelected ? 'hsl(var(--primary))' : cfg.border }}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0 mt-0.5" style={{ backgroundColor: `${cfg.color}20` }}><TypeIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{alert.title}</span>
            {!alert.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{alert.description}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {alert.territory && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="w-3 h-3" />{alert.territory}</span>}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            {alert.risk_index !== null && <IndexBadge value={Math.round(alert.risk_index)} label="Risco" variant="risk" />}
            {alert.opportunity_index !== null && <IndexBadge value={Math.round(alert.opportunity_index)} label="Opp" variant="opportunity" />}
          </div>
          <SeverityBar value={alert.severity} />
          {team.length > 0 && <div className="mt-2 pt-2 border-t" style={{ borderColor: cfg.border }}><ResponsibleChain entries={team} compact /></div>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: cfg.border }}>
        {alert.status !== 'resolvido' && <button onClick={e => { e.stopPropagation(); onUpdate(alert.id, 'resolvido'); }} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-brand-green px-2 py-1 rounded hover:bg-muted"><CheckCheck className="w-3 h-3" />Resolver</button>}
        <span className="ml-auto text-[10px] text-muted-foreground/50">{new Date(alert.created_at).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
}

function TabIA() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StrategicAlertType | 'all'>('all');
  const [macroFilter, setMacroFilter] = useState('all');
  const [minSeverity, setMinSeverity] = useState(0);
  const [selected, setSelected] = useState<StrategicAlert | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; status: StrategicAlertStatus } | null>(null);

  const { data: alerts = [], isLoading, refetch } = useStrategicAlerts({ type: typeFilter });
  const { data: kpis } = useStrategicKPIs();
  const { data: macroRegions = [] } = useMacroRegionsDB();
  const { data: members = [] } = useCampaignMembers();
  const runAnalysis = useRunStrategicAnalysis();
  const updateAlert = useUpdateStrategicAlert();
  const markRead = useMarkStrategicAlertRead();

  const handleRunAnalysis = async () => { setIsRunning(true); try { await runAnalysis.mutateAsync(); await refetch(); } finally { setIsRunning(false); } };
  const handleUpdate = (id: string, status: StrategicAlertStatus) => setPendingUpdate({ id, status });
  const confirmUpdate = (note: string) => {
    if (!pendingUpdate) return;
    updateAlert.mutate({ id: pendingUpdate.id, status: pendingUpdate.status, resolution_note: note } as any);
    if (selected?.id === pendingUpdate.id) setSelected(prev => prev ? { ...prev, status: pendingUpdate.status } : null);
    setPendingUpdate(null);
  };
  const handleSelect = (alert: StrategicAlert) => { setSelected(alert); if (!alert.is_read) markRead.mutate(alert.id); };

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    return (!search || a.title.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q) || (a.territory ?? '').toLowerCase().includes(q))
      && (macroFilter === 'all' || a.macroregion_id === macroFilter)
      && a.severity >= minSeverity;
  });

  const typeOrder: StrategicAlertType[] = ['risco_eleitoral', 'risco_operacional', 'ineficiencia_atuacao', 'oportunidade_estrategica'];
  const groupedAlerts = typeOrder.reduce((acc, type) => { const g = filtered.filter(a => a.type === type); if (g.length) acc[type] = g; return acc; }, {} as Record<StrategicAlertType, StrategicAlert[]>);
  const unread = alerts.filter(a => !a.is_read).length;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ResolutionDialog open={!!pendingUpdate} onClose={() => setPendingUpdate(null)} onConfirm={confirmUpdate} targetStatus={pendingUpdate?.status ?? ''} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        {[
          { label: 'Alertas Ativos', value: kpis?.active ?? 0, icon: ShieldAlert, color: 'hsl(var(--primary))', onClick: () => setTypeFilter('all') },
          { label: 'Críticos (8-10)', value: kpis?.critical ?? 0, icon: AlertTriangle, color: '#E53935', onClick: () => setMinSeverity(8) },
          { label: 'Oportunidades', value: kpis?.opportunities ?? 0, icon: Zap, color: '#43A047', onClick: () => setTypeFilter('oportunidade_estrategica') },
          { label: 'Índice de Risco', value: kpis?.riskIndex ?? 0, icon: TrendingDown, color: '#FBC02D', sub: '/100' },
          { label: 'Índice de Oportunidade', value: kpis?.opportunityIndex ?? 0, icon: TrendingUp, color: '#0FFCBE', sub: '/100' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={(s as any).onClick} className={`rounded-xl border border-border p-4 text-left transition-all group ${(s as any).onClick ? 'hover:border-primary/40 hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`} style={{ background: 'var(--gradient-card)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${s.color}20` }}><Icon className="w-3.5 h-3.5" style={{ color: s.color }} /></div>
                {(s as any).onClick && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
              </div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}{(s as any).sub && <span className="text-sm font-normal text-muted-foreground">{(s as any).sub}</span>}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2 items-center flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, descrição ou território..." className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">Todos os tipos</option>
            <option value="risco_eleitoral">Risco Eleitoral</option>
            <option value="risco_operacional">Risco Operacional</option>
            <option value="ineficiencia_atuacao">Ineficiência</option>
            <option value="oportunidade_estrategica">Oportunidade</option>
          </select>
          <select value={macroFilter} onChange={e => setMacroFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">Todas as regiões</option>
            {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={minSeverity} onChange={e => setMinSeverity(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value={0}>Toda severidade</option>
            <option value={8}>Crítico (8-10)</option>
            <option value={6}>Alto (6+)</option>
            <option value={4}>Médio (4+)</option>
          </select>
          {(typeFilter !== 'all' || macroFilter !== 'all' || search || minSeverity > 0) && (
            <button onClick={() => { setTypeFilter('all'); setMacroFilter('all'); setSearch(''); setMinSeverity(0); }} className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent flex items-center gap-1">
              <X className="w-3.5 h-3.5" />Limpar
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
          {filtered.length} alerta{filtered.length !== 1 ? 's' : ''}
          {unread > 0 && <span className="text-primary font-semibold"> · {unread} não lido{unread !== 1 ? 's' : ''}</span>}
        </span>
      </div>

      {/* List + Detail */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`overflow-auto p-4 space-y-3 ${selected ? 'w-[55%] border-r border-border' : 'flex-1'}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><RefreshCw className="w-4 h-4 animate-spin mr-2" />Carregando análise...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Brain className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Nenhum alerta estratégico</p>
              <p className="text-xs mt-1 mb-4">Execute a análise IA para gerar alertas com base nos dados reais</p>
              <button onClick={handleRunAnalysis} disabled={isRunning} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
                <Brain className="w-3.5 h-3.5" />{isRunning ? 'Analisando...' : 'Executar Análise Agora'}
              </button>
            </div>
          ) : (
            typeOrder.map(type => {
              const group = groupedAlerts[type];
              if (!group) return null;
              const cfg = ALERT_TYPE_CONFIG[type];
              const TypeIcon = type === 'oportunidade_estrategica' ? Zap : type === 'risco_eleitoral' ? BarChart2 : type === 'ineficiencia_atuacao' ? Activity : AlertTriangle;
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2 pt-1 first:pt-0">
                    <TypeIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{group.length}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {group.map(alert => <StrategicAlertCard key={alert.id} alert={alert} onSelect={handleSelect} isSelected={selected?.id === alert.id} onUpdate={handleUpdate} members={members} />)}
                </div>
              );
            })
          )}
        </div>
        {selected && (
          <div className="w-[45%] p-4 overflow-auto">
            <AlertDetailPanel alert={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} members={members} />
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — ALERTAS OPERACIONAIS (alerts table)
// ══════════════════════════════════════════════════════════════

type Level = 'all' | 'critico' | 'atencao' | 'oportunidade' | 'info';
type Status = 'all' | 'novo' | 'em_analise' | 'resolvido';

const OP_LEVEL_CONFIG: Record<string, {
  bg: string; border: string; icon: string; label: string;
  badge: string; badgeText: string; titleColor: string; bodyColor: string;
}> = {
  critico:      { bg: 'hsl(1 79% 96%)',   border: '#E53935', icon: '#E53935', label: 'Crítico',      badge: '#E53935', badgeText: '#fff', titleColor: '#7f1d1d', bodyColor: '#991b1b' },
  atencao:      { bg: 'hsl(42 96% 96%)',  border: '#FBC02D', icon: '#FBC02D', label: 'Atenção',      badge: '#FBC02D', badgeText: '#fff', titleColor: '#78350f', bodyColor: '#92400e' },
  oportunidade: { bg: 'hsl(123 46% 95%)', border: '#43A047', icon: '#43A047', label: 'Oportunidade', badge: '#43A047', badgeText: '#fff', titleColor: '#14532d', bodyColor: '#166534' },
  info:         { bg: 'hsl(210 84% 96%)', border: '#106EBE', icon: '#106EBE', label: 'Info',         badge: '#106EBE', badgeText: '#fff', titleColor: '#1e3a5f', bodyColor: '#1e40af' },
};
const OP_STATUS_LABEL: Record<string, string> = { novo: 'Novo', em_analise: 'Em Análise', resolvido: 'Resolvido' };

function levelIconOp(level: string) {
  if (level === 'critico') return AlertTriangle;
  if (level === 'oportunidade') return Zap;
  if (level === 'atencao') return Bell;
  return Activity;
}

// Difficulty scoring for analytics
function difficultyScore(alertsForCoord: DbAlert[]) {
  if (!alertsForCoord.length) return 0;
  const open = alertsForCoord.filter(a => a.status !== 'resolvido');
  const weighted = open.reduce((acc, a) => a.level === 'critico' ? acc + 3 : a.level === 'atencao' ? acc + 2 : acc + 1, 0);
  const resolutionRate = alertsForCoord.filter(a => a.status === 'resolvido').length / alertsForCoord.length;
  return Math.min(100, Math.round((weighted / alertsForCoord.length) * 33 + (1 - resolutionRate) * 67));
}
function difficultyLabel(score: number): { label: string; color: string; bg: string; icon: typeof Minus } {
  if (score >= 70) return { label: 'Atenção Crítica', color: '#E53935', bg: 'hsl(1 79% 96%)', icon: TrendingDown };
  if (score >= 40) return { label: 'Em Dificuldade', color: '#FBC02D', bg: 'hsl(42 96% 96%)', icon: Minus };
  return { label: 'Bom Desempenho', color: '#43A047', bg: 'hsl(123 46% 95%)', icon: TrendingUp };
}
function feedbackMessage(score: number, name: string) {
  if (score >= 70) return `${name} tem alta concentração de alertas críticos em aberto. Recomenda-se contato imediato, revisão do plano de ação e possível reforço de equipe.`;
  if (score >= 40) return `${name} apresenta dificuldade moderada. Sugere-se priorizar resolução dos alertas e revisar o cronograma de visitas.`;
  return `${name} está gerenciando bem sua região. Manter frequência de ações e replicar boas práticas.`;
}

function OperationalAnalytics({ alerts, members }: { alerts: DbAlert[]; members: import('@/types/database').DbCampaignMember[] }) {
  const [rankingExpanded, setRankingExpanded] = useState(false);
  const cityData = useMemo(() => {
    const counts: Record<string, { total: number; critico: number }> = {};
    for (const a of alerts) { const city = a.territory ?? 'Não identificado'; if (!counts[city]) counts[city] = { total: 0, critico: 0 }; counts[city].total++; if (a.level === 'critico') counts[city].critico++; }
    return Object.entries(counts).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [alerts]);

  const regionalMembers = useMemo(() => members.filter(m => m.hierarchy_level === 3 || (m.role.toLowerCase().includes('regional') && !m.role.toLowerCase().includes('microrregional'))), [members]);
  const microMembers = useMemo(() => members.filter(m => m.hierarchy_level === 4 || m.role.toLowerCase().includes('microrregional') || m.role.toLowerCase().includes('municipal')), [members]);

  const regionalData = useMemo(() => regionalMembers.map(c => {
    const ca = alerts.filter(a => a.macroregion_id === c.macroregion_id);
    return { name: c.name.split(' ').slice(0, 2).join(' '), total: ca.length, critico: ca.filter(a => a.level === 'critico').length, atencao: ca.filter(a => a.level === 'atencao').length, resolvido: ca.filter(a => a.status === 'resolvido').length };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 8), [alerts, regionalMembers]);

  const microData = useMemo(() => microMembers.map(c => {
    const ca = alerts.filter(a => a.macroregion_id === c.macroregion_id);
    return { name: c.name.split(' ').slice(0, 2).join(' '), total: ca.length, critico: ca.filter(a => a.level === 'critico').length, atencao: ca.filter(a => a.level === 'atencao').length, resolvido: ca.filter(a => a.status === 'resolvido').length };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 8), [alerts, microMembers]);

  const ranking = useMemo(() => {
    const all = [...regionalMembers.map(m => ({ ...m, coordType: 'Regional' as const })), ...microMembers.map(m => ({ ...m, coordType: 'Microrregional' as const }))];
    return all.map(c => { const ca = alerts.filter(a => a.macroregion_id === c.macroregion_id); const score = difficultyScore(ca); return { coord: c, alerts: ca, score, diff: difficultyLabel(score) }; }).filter(r => r.alerts.length > 0).sort((a, b) => b.score - a.score);
  }, [alerts, regionalMembers, microMembers]);

  const visibleRanking = rankingExpanded ? ranking : ranking.slice(0, 5);
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfographicHBar title="Alertas por Cidade" subtitle="top 10" data={cityData.map(d => ({ name: d.name, value: d.total, color: d.critico > 0 ? '#E53935' : '#106EBE' }))} accentColor="#106EBE" />
        {regionalData.length > 0 ? <InfographicVBar title="Coord. Regionais" subtitle="volume" data={regionalData} series={[{ key: 'critico', label: 'Críticos', color: '#E53935' }, { key: 'atencao', label: 'Atenção', color: '#FBC02D' }, { key: 'resolvido', label: 'Resolvidos', color: '#43A047' }]} height={180} /> : <div style={{ background: 'hsl(220 30% 13%)', border: '1px solid hsl(220 20% 22%)', borderRadius: 16, padding: 16 }}><p className="text-xs text-muted-foreground text-center py-8">Sem dados regionais</p></div>}
        {microData.length > 0 ? <InfographicVBar title="Coord. Microrregionais" subtitle="volume" data={microData} series={[{ key: 'critico', label: 'Críticos', color: '#E53935' }, { key: 'atencao', label: 'Atenção', color: '#FBC02D' }, { key: 'resolvido', label: 'Resolvidos', color: '#43A047' }]} height={180} /> : <div style={{ background: 'hsl(220 30% 13%)', border: '1px solid hsl(220 20% 22%)', borderRadius: 16, padding: 16 }}><p className="text-xs text-muted-foreground text-center py-8">Sem dados microrregionais</p></div>}
      </div>
      {ranking.length > 0 && (
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-amber" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Ranking de Desempenho — Coordenadores</span>
            </div>
            {ranking.length > 5 && <button onClick={() => setRankingExpanded(p => !p)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">{rankingExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}{rankingExpanded ? 'Ver menos' : `Ver todos (${ranking.length})`}</button>}
          </div>
          <div className="space-y-2">
            {visibleRanking.map((item, idx) => {
              const { diff, score, coord, alerts: ca } = item;
              const Icon = diff.icon;
              const open = ca.filter(a => a.status !== 'resolvido').length;
              const resolved = ca.filter(a => a.status === 'resolvido').length;
              const critCount = ca.filter(a => a.level === 'critico').length;
              return (
                <div key={coord.id} className="rounded-lg border p-3 flex items-start gap-3" style={{ backgroundColor: diff.bg, borderColor: `${diff.color}30` }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black" style={{ backgroundColor: `${diff.color}20`, color: diff.color }}>{idx + 1}</div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${diff.color}15` }}><Icon className="w-3.5 h-3.5" style={{ color: diff.color }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-foreground">{coord.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${diff.color}20`, color: diff.color }}>{(coord as any).coordType}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed mb-2 text-muted-foreground">{feedbackMessage(score, coord.name.split(' ')[0])}</p>
                    <div className="flex items-center gap-3 text-[10px] flex-wrap">
                      <span className="text-muted-foreground">Total: <b className="text-foreground">{ca.length}</b></span>
                      {critCount > 0 && <span style={{ color: '#E53935' }}><b>{critCount}</b> crítico{critCount !== 1 ? 's' : ''}</span>}
                      <span style={{ color: '#FBC02D' }}><b>{open}</b> em aberto</span>
                      <span style={{ color: '#43A047' }}><CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /><b>{resolved}</b> resolvido{resolved !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center flex-shrink-0 gap-1">
                    <div className="text-lg font-black" style={{ color: diff.color }}>{score}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">índice</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${diff.color}20`, color: diff.color }}>{diff.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertOpRow({ alert, onRead, onStatusChange, members }: {
  alert: DbAlert; onRead: (id: string) => void; onStatusChange: (id: string, status: string) => void;
  members: import('@/types/database').DbCampaignMember[];
}) {
  const c = OP_LEVEL_CONFIG[alert.level] ?? OP_LEVEL_CONFIG.info;
  const Icon = levelIconOp(alert.level);
  const team = resolveAlertTeam(members, { macroregion_id: alert.macroregion_id, creatorName: alert.responsible_name ?? undefined, creatorRole: alert.responsible_role ?? undefined });
  return (
    <div className="rounded-xl border-l-4 border p-4 transition-all hover:scale-[1.005] group cursor-pointer" style={{ backgroundColor: c.bg, borderLeftColor: c.border, borderColor: `${c.border}55` }} onClick={() => !alert.is_read && onRead(alert.id)}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0 mt-0.5" style={{ backgroundColor: `${c.badge}22` }}><Icon className="w-4 h-4" style={{ color: c.icon }} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-sm leading-tight" style={{ color: c.titleColor }}>{alert.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: c.badge, color: c.badgeText }}>{c.label}</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed mb-2 text-muted-foreground">{alert.description}</p>
          {alert.recommendation && <div className="mb-2 text-xs font-semibold flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${c.badge}18`, color: c.icon, border: `1px solid ${c.border}40` }}><span>💡</span><span>{alert.recommendation}</span></div>}
          {team.length > 0 && <div className="mb-2 pt-2 border-t" style={{ borderColor: `${c.border}40` }}><ResponsibleChain entries={team} compact /></div>}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {alert.territory && <span>📍 {alert.territory}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${c.badge}25`, color: c.icon }}>{OP_STATUS_LABEL[alert.status] ?? alert.status}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {alert.status === 'novo' && <button onClick={e => { e.stopPropagation(); onStatusChange(alert.id, 'em_analise'); }} className="text-[10px] px-2.5 py-1 rounded-md font-semibold" style={{ backgroundColor: `${c.badge}25`, color: c.icon }}>Em Análise</button>}
              {alert.status !== 'resolvido' && <button onClick={e => { e.stopPropagation(); onStatusChange(alert.id, 'resolvido'); }} className="text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold" style={{ backgroundColor: '#43A04720', color: '#43A047' }}><CheckCheck className="w-3 h-3" />Resolver</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabAlertas() {
  const { data: allAlerts = [], isLoading, refetch } = useAlerts();
  const { data: members = [] } = useCampaignMembers();
  const markRead = useMarkAlertRead();
  const updateStatus = useUpdateAlertStatus();
  const generateAlerts = useGenerateAlerts();

  const [levelFilter, setLevelFilter] = useState<Level>('all');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; status: string } | null>(null);

  const filtered = allAlerts.filter(a => {
    if (levelFilter !== 'all' && a.level !== levelFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search) { const q = search.toLowerCase(); if (!a.title.toLowerCase().includes(q) && !(a.description ?? '').toLowerCase().includes(q) && !(a.territory ?? '').toLowerCase().includes(q)) return false; }
    return true;
  });

  const handleRefresh = async () => { setIsRefreshing(true); await generateAlerts.mutateAsync(); await refetch(); setIsRefreshing(false); };
  const confirmStatusChange = (note: string) => { if (!pendingUpdate) return; updateStatus.mutate({ id: pendingUpdate.id, status: pendingUpdate.status as any, resolution_note: note } as any); setPendingUpdate(null); };
  const markAllRead = () => allAlerts.filter(a => !a.is_read).forEach(a => markRead.mutate(a.id));

  const criticos = allAlerts.filter(a => a.level === 'critico').length;
  const atencao = allAlerts.filter(a => a.level === 'atencao').length;
  const oportunidades = allAlerts.filter(a => a.level === 'oportunidade').length;
  const unread = allAlerts.filter(a => !a.is_read).length;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <ResolutionDialog open={!!pendingUpdate} onClose={() => setPendingUpdate(null)} onConfirm={confirmStatusChange} targetStatus={pendingUpdate?.status ?? ''} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: criticos, label: 'Críticos', color: '#E53935', icon: AlertTriangle },
          { value: atencao, label: 'Atenção', color: '#FBC02D', icon: Bell },
          { value: oportunidades, label: 'Oportunidades', color: '#43A047', icon: Zap },
          { value: unread, label: 'Não lidos', color: '#106EBE', icon: Activity },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-border p-4 flex items-center gap-3" style={{ background: 'var(--gradient-card)' }}>
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${s.color}18` }}><Icon className="w-5 h-5" style={{ color: s.color }} /></div>
              <div><div className="text-2xl font-black text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </div>
          );
        })}
      </div>

      {/* Analytics */}
      {!isLoading && <OperationalAnalytics alerts={allAlerts} members={members} />}

      {/* Filters */}
      <div className="rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center" style={{ background: 'var(--gradient-card)' }}>
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'critico', 'atencao', 'oportunidade', 'info'] as Level[]).map(l => (
            <button key={l} onClick={() => setLevelFilter(l)} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${levelFilter === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {l === 'all' ? 'Todos Níveis' : OP_LEVEL_CONFIG[l]?.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'novo', 'em_analise', 'resolvido'] as Status[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {s === 'all' ? 'Todos Status' : OP_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {unread > 0 && <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground"><CheckCircle className="w-3.5 h-3.5" />Marcar lidos</button>}
          <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground"><RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />{isRefreshing ? 'Gerando...' : 'Gerar Alertas'}</button>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center" style={{ background: 'var(--gradient-card)' }}>
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum alerta encontrado.</p>
            <button onClick={() => { setLevelFilter('all'); setStatusFilter('all'); setSearch(''); }} className="mt-3 text-xs text-primary hover:underline">Limpar filtros</button>
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground px-1 mb-1">{filtered.length} alerta{filtered.length !== 1 ? 's' : ''}</div>
            {filtered.map(alert => <AlertOpRow key={alert.id} alert={alert} onRead={id => markRead.mutate(id)} onStatusChange={(id, status) => setPendingUpdate({ id, status })} members={members} />)}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN — Sala de Crise (tabbed)
// ══════════════════════════════════════════════════════════════

type Tab = 'ia' | 'alertas';

export default function SalaDeCrise() {
  const [tab, setTab] = useState<Tab>('ia');
  const [isRunning, setIsRunning] = useState(false);
  const runAnalysis = useRunStrategicAnalysis();
  const { refetch } = useStrategicAlerts({ type: 'all' });

  const handleRunAnalysis = async () => { setIsRunning(true); try { await runAnalysis.mutateAsync(); await refetch(); } finally { setIsRunning(false); } };

  const tabs: { key: Tab; label: string; icon: typeof Brain; badge?: string }[] = [
    { key: 'ia', label: 'IA Estratégica', icon: Brain },
    { key: 'alertas', label: 'Alertas Operacionais', icon: Bell },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-brand-red" />
          <div>
            <h1 className="text-base font-bold text-foreground">Sala de Crise</h1>
            <p className="text-xs text-muted-foreground">Inteligência estratégica, análise preditiva e gestão de alertas operacionais</p>
          </div>
        </div>
        {tab === 'ia' && (
          <button onClick={handleRunAnalysis} disabled={isRunning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--gradient-primary)' }}>
            <Brain className={`w-3.5 h-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Analisando...' : 'Executar Análise IA'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-border flex-shrink-0">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'ia' && <TabIA />}
        {tab === 'alertas' && <TabAlertas />}
      </div>
    </div>
  );
}
