import { useState } from 'react';
import {
  AlertTriangle, Zap, Activity, CheckCheck, Bell, Filter,
  RefreshCw, CheckCircle, Clock, XCircle, Search,
} from 'lucide-react';
import { useAlerts, useMarkAlertRead, useUpdateAlertStatus, useGenerateAlerts } from '@/hooks/useDashboard';
import type { DbAlert } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────
type Level = 'all' | 'critico' | 'atencao' | 'oportunidade' | 'info';
type Status = 'all' | 'novo' | 'em_analise' | 'resolvido';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  critico:     { bg: 'hsl(var(--brand-red) / 0.1)',   border: 'hsl(var(--brand-red) / 0.35)',   icon: 'hsl(var(--brand-red))',   label: 'Crítico' },
  atencao:     { bg: 'hsl(var(--brand-amber) / 0.1)', border: 'hsl(var(--brand-amber) / 0.35)', icon: 'hsl(var(--brand-amber))', label: 'Atenção' },
  oportunidade:{ bg: 'hsl(var(--brand-green) / 0.1)', border: 'hsl(var(--brand-green) / 0.35)', icon: 'hsl(var(--brand-green))', label: 'Oportunidade' },
  info:        { bg: 'hsl(var(--primary) / 0.1)',     border: 'hsl(var(--primary) / 0.35)',     icon: 'hsl(var(--primary))',     label: 'Info' },
};

const STATUS_LABEL: Record<string, string> = {
  novo: 'Novo', em_analise: 'Em Análise', resolvido: 'Resolvido',
};

function levelIcon(level: string) {
  if (level === 'critico') return AlertTriangle;
  if (level === 'oportunidade') return Zap;
  if (level === 'atencao') return Bell;
  return Activity;
}

// ─── Alert Row ────────────────────────────────────────────────────────────────
function AlertRow({ alert, onRead, onStatusChange }: {
  alert: DbAlert;
  onRead: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const c = LEVEL_CONFIG[alert.level] ?? LEVEL_CONFIG.info;
  const Icon = levelIcon(alert.level);

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:scale-[1.005] group"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
      onClick={() => !alert.is_read && onRead(alert.id)}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${c.icon.replace(')', ' / 0.15)')}` }}>
          <Icon className="w-4 h-4" style={{ color: c.icon }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm text-foreground leading-tight">{alert.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary" />}
              <span
                className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: c.border, color: c.icon }}
              >
                {LEVEL_CONFIG[alert.level]?.label}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
          {alert.recommendation && (
            <div className="mt-2 text-xs font-medium flex items-start gap-1" style={{ color: c.icon }}>
              <span>💡</span>
              <span>{alert.recommendation}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {alert.territory && (
                <span className="flex items-center gap-1">
                  <span>📍</span>{alert.territory}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(alert.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                style={{ borderColor: c.border, color: c.icon }}
              >
                {STATUS_LABEL[alert.status] ?? alert.status}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {alert.status === 'novo' && (
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange(alert.id, 'em_analise'); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-accent text-muted-foreground transition-colors"
                >
                  Em Análise
                </button>
              )}
              {alert.status !== 'resolvido' && (
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange(alert.id, 'resolvido'); }}
                  className="text-[10px] px-2 py-1 rounded-md flex items-center gap-1"
                  style={{ backgroundColor: 'hsl(var(--brand-green) / 0.15)', color: 'hsl(var(--brand-green))' }}
                >
                  <CheckCheck className="w-3 h-3" />
                  Resolver
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, icon: Icon }: { value: number; label: string; color: string; icon: any }) {
  return (
    <div className="rounded-xl border border-border p-4 flex items-center gap-3" style={{ background: 'var(--gradient-card)' }}>
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color.replace(')', ' / 0.15)')}` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-black text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Alertas() {
  const { data: allAlerts = [], isLoading, refetch } = useAlerts();
  const markRead = useMarkAlertRead();
  const updateStatus = useUpdateAlertStatus();
  const generateAlerts = useGenerateAlerts();

  const [levelFilter, setLevelFilter] = useState<Level>('all');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all alerts including resolved for this dedicated page
  const { data: resolvedAlerts = [] } = useAlerts();

  const filtered = allAlerts.filter(a => {
    if (levelFilter !== 'all' && a.level !== levelFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.description ?? '').toLowerCase().includes(q) && !(a.territory ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await generateAlerts.mutateAsync();
    await refetch();
    setIsRefreshing(false);
  };

  const criticos = allAlerts.filter(a => a.level === 'critico').length;
  const atencao = allAlerts.filter(a => a.level === 'atencao').length;
  const oportunidades = allAlerts.filter(a => a.level === 'oportunidade').length;
  const unread = allAlerts.filter(a => !a.is_read).length;

  const markAllRead = () => {
    allAlerts.filter(a => !a.is_read).forEach(a => markRead.mutate(a.id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-brand-amber" />
          <div>
            <h1 className="text-base font-bold text-foreground">Alertas Estratégicos</h1>
            <p className="text-xs text-muted-foreground">Monitoramento e gestão de alertas da campanha</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Marcar todos lidos
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Gerando...' : 'Gerar Alertas'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={criticos} label="Críticos" color="hsl(var(--brand-red))" icon={AlertTriangle} />
          <StatCard value={atencao} label="Atenção" color="hsl(var(--brand-amber))" icon={Bell} />
          <StatCard value={oportunidades} label="Oportunidades" color="hsl(var(--brand-green))" icon={Zap} />
          <StatCard value={unread} label="Não lidos" color="hsl(var(--primary))" icon={Activity} />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center" style={{ background: 'var(--gradient-card)' }}>
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou território..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Level filter */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'critico', 'atencao', 'oportunidade', 'info'] as Level[]).map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${levelFilter === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {l === 'all' ? 'Todos Níveis' : LEVEL_CONFIG[l]?.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'novo', 'em_analise', 'resolvido'] as Status[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {s === 'all' ? 'Todos Status' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border p-12 text-center" style={{ background: 'var(--gradient-card)' }}>
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">Nenhum alerta encontrado com esses filtros.</p>
              <button onClick={() => { setLevelFilter('all'); setStatusFilter('all'); setSearch(''); }}
                className="mt-3 text-xs text-primary hover:underline">
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground px-1 mb-1">
                {filtered.length} alerta{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </div>
              {filtered.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onRead={id => markRead.mutate(id)}
                  onStatusChange={(id, status) => updateStatus.mutate({ id, status: status as any })}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
