import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Zap, AlertTriangle, Activity, TrendingUp, TrendingDown,
  Search, Filter, RefreshCw, CheckCheck, Eye, X, MapPin, Clock,
  Brain, ChevronRight, BarChart2, Flame, ClipboardList, User,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  useStrategicAlerts,
  useStrategicKPIs,
  useRunStrategicAnalysis,
  useUpdateStrategicAlert,
  useMarkStrategicAlertRead,
  ALERT_TYPE_CONFIG,
  type StrategicAlert,
  type StrategicAlertType,
  type StrategicAlertStatus,
} from '@/hooks/useStrategicAlerts';
import { useMacroRegionsDB } from '@/hooks/useDashboard';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import { ResponsibleChain } from '@/components/alerts/ResponsibleChain';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SeverityBar({ value }: { value: number }) {
  const color =
    value >= 8 ? '#ef4444' :
    value >= 6 ? '#f59e0b' :
    value >= 4 ? '#3b82f6' : '#22c55e';
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
    ? (value >= 70 ? '#ef4444' : value >= 40 ? '#f59e0b' : '#22c55e')
    : (value >= 60 ? '#22c55e' : value >= 30 ? '#3b82f6' : '#94a3b8');
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
      {variant === 'risk' ? <TrendingDown className="w-3 h-3" style={{ color }} /> : <TrendingUp className="w-3 h-3" style={{ color }} />}
      <span className="text-[10px] font-semibold" style={{ color }}>{label}: {value}</span>
    </div>
  );
}

// ─── Alert Detail Panel ───────────────────────────────────────────────────────
function AlertDetailPanel({
  alert, onClose, onUpdate,
}: {
  alert: StrategicAlert;
  onClose: () => void;
  onUpdate: (id: string, status: StrategicAlertStatus) => void;
}) {
  const cfg = ALERT_TYPE_CONFIG[alert.type];
  const TypeIcon =
    alert.type === 'oportunidade_estrategica' ? Zap :
    alert.type === 'risco_eleitoral' ? BarChart2 :
    alert.type === 'ineficiencia_atuacao' ? Activity : AlertTriangle;

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
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          {alert.territory && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              <MapPin className="w-3.5 h-3.5" /> {alert.territory}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5" /> {new Date(alert.created_at).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            <Flame className="w-3.5 h-3.5" /> Severidade {alert.severity}/10
          </div>
        </div>

        {/* Responsible & Hierarchy — who to call */}
        {(alert.responsible_name || (alert.hierarchy_chain && alert.hierarchy_chain.length > 0)) && (
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <ResponsibleChain
              responsibleName={alert.responsible_name}
              responsibleRole={alert.responsible_role}
              hierarchyChain={alert.hierarchy_chain}
            />
          </div>
        )}

        {/* Indices */}
        <div className="grid grid-cols-2 gap-3">
          {alert.risk_index !== null && (
            <div className="rounded-lg p-3 bg-muted/40 border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Índice de Risco</div>
              <div className="text-2xl font-black text-destructive">{alert.risk_index?.toFixed(0)}</div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div className="h-full rounded-full bg-destructive transition-all" style={{ width: `${alert.risk_index}%` }} />
              </div>
            </div>
          )}
          {alert.opportunity_index !== null && (
            <div className="rounded-lg p-3 bg-muted/40 border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Índice de Oportunidade</div>
              <div className="text-2xl font-black text-brand-green">{alert.opportunity_index?.toFixed(0)}</div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${alert.opportunity_index}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Análise</div>
          <p className="text-sm text-foreground leading-relaxed">{alert.description}</p>
        </div>

        {/* Recommendation */}
        {alert.recommendation && (
          <div className="rounded-xl border p-4" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4" style={{ color: cfg.color }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>Recomendação Estratégica IA</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{alert.recommendation}</p>
          </div>
        )}

        {/* Source data */}
        {alert.source_data && Object.keys(alert.source_data).length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dados de Origem</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(alert.source_data).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-muted/40 text-xs">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-foreground">
                    {typeof v === 'number' ? (Number.isInteger(v) ? v : (v as number).toFixed(1)) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: cfg.border }}>
        {alert.status === 'ativo' && (
          <button
            onClick={() => onUpdate(alert.id, 'em_analise')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Em Análise
          </button>
        )}
        {alert.status !== 'resolvido' && (
          <button
            onClick={() => onUpdate(alert.id, 'resolvido')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary-foreground transition-colors ml-auto"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <CheckCheck className="w-3.5 h-3.5" /> Marcar Resolvido
          </button>
        )}
        {alert.status !== 'descartado' && (
          <button
            onClick={() => onUpdate(alert.id, 'descartado')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Descartar
          </button>
        )}
      </div>
    </div>
  );
}


// ─── Alert Card ────────────────────────────────────────────────────────────────
function AlertCard({
  alert, onSelect, isSelected, onUpdate,
}: {
  alert: StrategicAlert;
  onSelect: (a: StrategicAlert) => void;
  isSelected: boolean;
  onUpdate: (id: string, status: StrategicAlertStatus) => void;
}) {
  const cfg = ALERT_TYPE_CONFIG[alert.type];
  const TypeIcon =
    alert.type === 'oportunidade_estrategica' ? Zap :
    alert.type === 'risco_eleitoral' ? BarChart2 :
    alert.type === 'ineficiencia_atuacao' ? Activity : AlertTriangle;

  return (
    <div
      onClick={() => onSelect(alert)}
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] group ${isSelected ? 'ring-2 ring-primary/50' : ''}`}
      style={{
        backgroundColor: cfg.bg,
        borderColor: isSelected ? 'hsl(var(--primary))' : cfg.border,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0 mt-0.5" style={{ backgroundColor: `${cfg.color}20` }}>
          <TypeIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{alert.title}</span>
            {!alert.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{alert.description}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {alert.territory && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {alert.territory}
              </span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            {alert.risk_index !== null && <IndexBadge value={Math.round(alert.risk_index)} label="Risco" variant="risk" />}
            {alert.opportunity_index !== null && <IndexBadge value={Math.round(alert.opportunity_index)} label="Opp" variant="opportunity" />}
          </div>
          <SeverityBar value={alert.severity} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: cfg.border }}>
        {alert.status !== 'resolvido' && (
          <button
            onClick={e => { e.stopPropagation(); onUpdate(alert.id, 'resolvido'); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-brand-green px-2 py-1 rounded hover:bg-muted"
          >
            <CheckCheck className="w-3 h-3" /> Resolver
          </button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/50">
          {new Date(alert.created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// ─── Resolution Dialog ─────────────────────────────────────────────────────────
function ResolutionDialog({
  open, onClose, onConfirm, targetStatus,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  targetStatus: string;
}) {
  const [note, setNote] = useState('');
  const isResolve = targetStatus === 'resolvido' || targetStatus === 'descartado';

  const handleSubmit = () => {
    if (!note.trim()) return;
    onConfirm(note.trim());
    setNote('');
  };

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
              ? 'Descreva obrigatoriamente qual ação foi realizada para resolver este alerta estratégico.'
              : 'Descreva obrigatoriamente qual ação foi planejada para tratar este alerta.'}
          </p>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isResolve
              ? 'Ex: Mobilização realizada no município, liderança contatada e ação agendada...'
              : 'Ex: Reunião estratégica marcada para esta semana com coordenador regional...'}
            className="min-h-[100px] resize-none"
          />
          {note.trim().length === 0 && (
            <p className="text-xs text-destructive">* Campo obrigatório para atualizar o status.</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!note.trim()} onClick={handleSubmit}>
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SalaDeCrise() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StrategicAlertType | 'all'>('all');
  const [macroFilter, setMacroFilter] = useState<string>('all');
  const [minSeverity, setMinSeverity] = useState<number>(0);
  const [selected, setSelected] = useState<StrategicAlert | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; status: StrategicAlertStatus } | null>(null);

  const { data: alerts = [], isLoading, refetch } = useStrategicAlerts({ type: typeFilter });
  const { data: kpis } = useStrategicKPIs();
  const { data: macroRegions = [] } = useMacroRegionsDB();
  const runAnalysis = useRunStrategicAnalysis();
  const updateAlert = useUpdateStrategicAlert();
  const markRead = useMarkStrategicAlertRead();

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    try {
      await runAnalysis.mutateAsync();
      await refetch();
    } finally {
      setIsRunning(false);
    }
  };

  // Opens dialog before updating
  const requestUpdate = (id: string, status: StrategicAlertStatus) => {
    setPendingUpdate({ id, status });
  };

  const confirmUpdate = (note: string) => {
    if (!pendingUpdate) return;
    updateAlert.mutate({ id: pendingUpdate.id, status: pendingUpdate.status, resolution_note: note });
    if (selected?.id === pendingUpdate.id) setSelected(prev => prev ? { ...prev, status: pendingUpdate.status } : null);
    setPendingUpdate(null);
  };

  // handleUpdate now routes through dialog
  const handleUpdate = (id: string, status: StrategicAlertStatus) => {
    requestUpdate(id, status);
  };

  const handleSelect = (alert: StrategicAlert) => {
    setSelected(alert);
    if (!alert.is_read) markRead.mutate(alert.id);
  };

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || a.title.toLowerCase().includes(q)
      || (a.description ?? '').toLowerCase().includes(q)
      || (a.territory ?? '').toLowerCase().includes(q);
    const matchMacro = macroFilter === 'all' || a.macroregion_id === macroFilter;
    const matchSeverity = a.severity >= minSeverity;
    return matchSearch && matchMacro && matchSeverity;
  });

  // Group by type priority
  const typeOrder: StrategicAlertType[] = [
    'risco_eleitoral', 'risco_operacional', 'ineficiencia_atuacao', 'oportunidade_estrategica',
  ];

  const groupedAlerts = typeOrder.reduce((acc, type) => {
    const group = filtered.filter(a => a.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {} as Record<StrategicAlertType, StrategicAlert[]>);

  const unread = alerts.filter(a => !a.is_read).length;

  return (
    <div className="h-full flex flex-col">
      {/* Resolution Dialog */}
      <ResolutionDialog
        open={!!pendingUpdate}
        onClose={() => setPendingUpdate(null)}
        onConfirm={confirmUpdate}
        targetStatus={pendingUpdate?.status ?? ''}
      />
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-brand-red" />
          <div>
            <h1 className="text-base font-bold text-foreground">Sala de Crise — IA Estratégica</h1>
            <p className="text-xs text-muted-foreground">Análise preditiva automática com motor de regras + inteligência artificial</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAnalysis}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Brain className={`w-3.5 h-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Analisando...' : 'Executar Análise IA'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Sala de Guerra
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          {[
            { label: 'Alertas Ativos', value: kpis?.active ?? 0, icon: ShieldAlert, color: 'hsl(var(--primary))', onClick: () => setTypeFilter('all') },
            { label: 'Críticos (8-10)', value: kpis?.critical ?? 0, icon: AlertTriangle, color: 'hsl(var(--brand-red))', onClick: () => setMinSeverity(8) },
            { label: 'Oportunidades', value: kpis?.opportunities ?? 0, icon: Zap, color: 'hsl(var(--brand-green))', onClick: () => setTypeFilter('oportunidade_estrategica') },
            { label: 'Índice de Risco', value: kpis?.riskIndex ?? 0, icon: TrendingDown, color: 'hsl(var(--brand-amber))', sub: '/100' },
            { label: 'Índice de Oportunidade', value: kpis?.opportunityIndex ?? 0, icon: TrendingUp, color: 'hsl(var(--brand-cyan))', sub: '/100' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={s.onClick}
                className={`rounded-xl border border-border p-4 text-left transition-all group ${s.onClick ? 'hover:border-primary/40 hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
                style={{ background: 'var(--gradient-card)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${s.color}20` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  {s.onClick && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
                </div>
                <div className="text-2xl font-black" style={{ color: s.color }}>
                  {s.value}{(s as any).sub && <span className="text-sm font-normal text-muted-foreground">{(s as any).sub}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2 items-center flex-shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou território..."
              className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as StrategicAlertType | 'all')}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Todos os tipos</option>
              <option value="risco_eleitoral">Risco Eleitoral</option>
              <option value="risco_operacional">Risco Operacional</option>
              <option value="ineficiencia_atuacao">Ineficiência</option>
              <option value="oportunidade_estrategica">Oportunidade</option>
            </select>
            <select
              value={macroFilter}
              onChange={e => setMacroFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Todas as regiões</option>
              {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={minSeverity}
              onChange={e => setMinSeverity(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value={0}>Toda severidade</option>
              <option value={8}>Crítico (8-10)</option>
              <option value={6}>Alto (6+)</option>
              <option value={4}>Médio (4+)</option>
            </select>
            {(typeFilter !== 'all' || macroFilter !== 'all' || search || minSeverity > 0) && (
              <button
                onClick={() => { setTypeFilter('all'); setMacroFilter('all'); setSearch(''); setMinSeverity(0); }}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
            {filtered.length} alerta{filtered.length !== 1 ? 's' : ''}
            {unread > 0 && <span className="text-primary font-semibold"> · {unread} não lido{unread !== 1 ? 's' : ''}</span>}
          </span>
        </div>

        {/* Main: list + detail */}
        <div className="flex-1 overflow-hidden flex">
          {/* Alert List */}
          <div className={`overflow-auto p-4 space-y-3 ${selected ? 'w-[55%] border-r border-border' : 'flex-1'}`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando análise...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Brain className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Nenhum alerta estratégico</p>
                <p className="text-xs mt-1 mb-4">Execute a análise IA para gerar alertas com base nos dados reais</p>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Brain className="w-3.5 h-3.5" />
                  {isRunning ? 'Analisando...' : 'Executar Análise Agora'}
                </button>
              </div>
            ) : (
              typeOrder.map(type => {
                const group = groupedAlerts[type];
                if (!group) return null;
                const cfg = ALERT_TYPE_CONFIG[type];
                const TypeIcon =
                  type === 'oportunidade_estrategica' ? Zap :
                  type === 'risco_eleitoral' ? BarChart2 :
                  type === 'ineficiencia_atuacao' ? Activity : AlertTriangle;
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2 pt-1 first:pt-0">
                      <TypeIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{group.length}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {group.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onSelect={handleSelect}
                        isSelected={selected?.id === alert.id}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-[45%] p-4 overflow-auto">
              <AlertDetailPanel
                alert={selected}
                onClose={() => setSelected(null)}
                onUpdate={handleUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
