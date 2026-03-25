import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, AlertTriangle, Zap, Activity, Info, Search,
  ChevronRight, CheckCheck, Filter, TrendingUp, TrendingDown,
  MapPin, Clock, Shield, Eye, EyeOff, RefreshCw, X
} from 'lucide-react';
import { useAlerts, useMarkAlertRead, useUpdateAlertStatus } from '@/hooks/useDashboard';
import type { DbAlert } from '@/types/database';

// ─── Config ──────────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  critico:      { icon: AlertTriangle, color: 'hsl(var(--brand-red))',   bg: 'hsl(var(--brand-red) / 0.08)',   border: 'hsl(var(--brand-red) / 0.25)',   label: 'CRÍTICO',      badge: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  atencao:      { icon: Activity,      color: 'hsl(var(--brand-amber))', bg: 'hsl(var(--brand-amber) / 0.08)', border: 'hsl(var(--brand-amber) / 0.25)', label: 'ATENÇÃO',      badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  oportunidade: { icon: Zap,           color: 'hsl(var(--brand-green))', bg: 'hsl(var(--brand-green) / 0.08)', border: 'hsl(var(--brand-green) / 0.25)', label: 'OPORTUNIDADE', badge: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  info:         { icon: Info,          color: 'hsl(var(--primary))',     bg: 'hsl(var(--primary) / 0.08)',     border: 'hsl(var(--primary) / 0.25)',     label: 'INFO',         badge: 'bg-primary/15 text-primary border border-primary/30' },
} as const;

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo', em_analise: 'Em Análise', resolvido: 'Resolvido',
};

// ─── Alert Card ──────────────────────────────────────────────────────────────
function AlertCard({
  alert, onRead, onResolve, onClick, isSelected,
}: {
  alert: DbAlert;
  onRead: (id: string) => void;
  onResolve: (id: string) => void;
  onClick: (a: DbAlert) => void;
  isSelected: boolean;
}) {
  const cfg = LEVEL_CONFIG[alert.level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      onClick={() => onClick(alert)}
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] group ${isSelected ? 'ring-2 ring-primary/50' : ''}`}
      style={{ backgroundColor: cfg.bg, borderColor: isSelected ? 'hsl(var(--primary))' : cfg.border }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0 mt-0.5" style={{ backgroundColor: `${cfg.color}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{alert.title}</span>
            {!alert.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{alert.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {alert.territory && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {alert.territory}
              </span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
              {STATUS_LABELS[alert.status] ?? alert.status}
            </span>
          </div>
        </div>
      </div>
      {/* Action buttons on hover */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: cfg.border }}>
        {!alert.is_read && (
          <button
            onClick={e => { e.stopPropagation(); onRead(alert.id); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
          >
            <Eye className="w-3 h-3" /> Marcar lido
          </button>
        )}
        {alert.status !== 'resolvido' && (
          <button
            onClick={e => { e.stopPropagation(); onResolve(alert.id); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-brand-green transition-colors px-2 py-1 rounded-md hover:bg-muted"
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

// ─── Detail Panel ────────────────────────────────────────────────────────────
function AlertDetail({ alert, onClose, onRead, onResolve }: {
  alert: DbAlert;
  onClose: () => void;
  onRead: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const cfg = LEVEL_CONFIG[alert.level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className="h-full flex flex-col rounded-xl border overflow-hidden" style={{ background: 'var(--gradient-card)', borderColor: cfg.border }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: `${cfg.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge} mb-1.5 inline-block`}>{cfg.label}</span>
            <h3 className="text-sm font-bold text-foreground leading-tight">{alert.title}</h3>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-3">
          {alert.territory && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              <MapPin className="w-3.5 h-3.5" /> {alert.territory}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5" /> {new Date(alert.created_at).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            <Shield className="w-3.5 h-3.5" /> Severidade {alert.severity}/10
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${cfg.badge}`}>
            {STATUS_LABELS[alert.status] ?? alert.status}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descrição</div>
          <p className="text-sm text-foreground leading-relaxed">{alert.description}</p>
        </div>

        {/* Recommendation */}
        {alert.recommendation && (
          <div className="rounded-xl border p-4" style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" style={{ color: cfg.color }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>Recomendação Estratégica</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{alert.recommendation}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: cfg.border }}>
        {!alert.is_read && (
          <button
            onClick={() => onRead(alert.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" /> Marcar como lido
          </button>
        )}
        {alert.status !== 'resolvido' && (
          <button
            onClick={() => onResolve(alert.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors ml-auto"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <CheckCheck className="w-3.5 h-3.5" /> Marcar como Resolvido
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Inteligencia() {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading, refetch } = useAlerts(true);
  const markRead = useMarkAlertRead();
  const updateStatus = useUpdateAlertStatus();

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<DbAlert | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || a.title.toLowerCase().includes(q)
      || (a.description ?? '').toLowerCase().includes(q)
      || (a.territory ?? '').toLowerCase().includes(q);
    const matchLevel = levelFilter === 'all' || a.level === levelFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchLevel && matchStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleRead = (id: string) => {
    markRead.mutate(id);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_read: true } : null);
  };

  const handleResolve = (id: string) => {
    updateStatus.mutate({ id, status: 'resolvido' });
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: 'resolvido' } : null);
  };

  const criticos = alerts.filter(a => a.level === 'critico' && a.status !== 'resolvido');
  const atencao = alerts.filter(a => a.level === 'atencao' && a.status !== 'resolvido');
  const oportunidades = alerts.filter(a => a.level === 'oportunidade' && a.status !== 'resolvido');
  const unread = alerts.filter(a => !a.is_read).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Inteligência Estratégica</h1>
            <p className="text-xs text-muted-foreground">Alertas automáticos, análise de riscos e oportunidades territoriais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => navigate('/alertas')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ background: 'var(--gradient-primary)' }}
          >
            Ver todos os alertas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          {[
            { label: 'Alertas Críticos', count: criticos.length, icon: AlertTriangle, color: 'hsl(var(--brand-red))', onClick: () => setLevelFilter('critico') },
            { label: 'Em Atenção', count: atencao.length, icon: Activity, color: 'hsl(var(--brand-amber))', onClick: () => setLevelFilter('atencao') },
            { label: 'Oportunidades', count: oportunidades.length, icon: Zap, color: 'hsl(var(--brand-green))', onClick: () => setLevelFilter('oportunidade') },
            { label: 'Não Lidos', count: unread, icon: Eye, color: 'hsl(var(--primary))', onClick: () => setStatusFilter('novo') },
          ].map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={s.onClick}
                className="rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:scale-[1.02] transition-all group"
                style={{ background: 'var(--gradient-card)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${s.color}20` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
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
              placeholder="Buscar alertas por título, descrição ou território..."
              className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">Todos os níveis</option>
              <option value="critico">Crítico</option>
              <option value="atencao">Atenção</option>
              <option value="oportunidade">Oportunidade</option>
              <option value="info">Info</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">Todos os status</option>
              <option value="novo">Novo</option>
              <option value="em_analise">Em Análise</option>
              <option value="resolvido">Resolvido</option>
            </select>
            {(levelFilter !== 'all' || statusFilter !== 'all' || search) && (
              <button
                onClick={() => { setLevelFilter('all'); setStatusFilter('all'); setSearch(''); }}
                className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
            {filtered.length} de {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Main content: list + detail panel */}
        <div className="flex-1 overflow-hidden flex">
          {/* Alert List */}
          <div className={`overflow-auto p-4 space-y-2 ${selected ? 'w-[55%] border-r border-border' : 'flex-1'}`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando alertas...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Brain className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Nenhum alerta encontrado</p>
                <p className="text-xs mt-1">Tente ajustar os filtros</p>
              </div>
            ) : (
              <>
                {/* Group by level */}
                {(['critico', 'atencao', 'oportunidade', 'info'] as const).map(level => {
                  const group = filtered.filter(a => a.level === level);
                  if (!group.length) return null;
                  const cfg = LEVEL_CONFIG[level];
                  const Icon = cfg.icon;
                  return (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center gap-2 pt-2 first:pt-0">
                        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{group.length}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {group.map(alert => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          onRead={handleRead}
                          onResolve={handleResolve}
                          onClick={setSelected}
                          isSelected={selected?.id === alert.id}
                        />
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-[45%] p-4 overflow-auto">
              <AlertDetail
                alert={selected}
                onClose={() => setSelected(null)}
                onRead={handleRead}
                onResolve={handleResolve}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
