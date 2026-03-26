import { useState, useMemo } from 'react';
import {
  AlertTriangle, Zap, Activity, CheckCheck, Bell, Filter,
  RefreshCw, CheckCircle, Clock, Search, ClipboardList,
  TrendingUp, TrendingDown, Minus, Trophy, AlertOctagon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAlerts, useMarkAlertRead, useUpdateAlertStatus, useGenerateAlerts } from '@/hooks/useDashboard';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import type { DbAlert } from '@/types/database';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResponsibleChain } from '@/components/alerts/ResponsibleChain';
import { resolveAlertTeam } from '@/lib/alertTeam';

// ─── Types ────────────────────────────────────────────────────────────────────
type Level = 'all' | 'critico' | 'atencao' | 'oportunidade' | 'info';
type Status = 'all' | 'novo' | 'em_analise' | 'resolvido';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, {
  bg: string; border: string; icon: string; label: string;
  badge: string; badgeText: string; titleColor: string; bodyColor: string;
}> = {
  critico:     {
    bg: 'hsl(0 55% 15%)',        border: 'hsl(0 75% 52%)',
    icon: 'hsl(0 90% 72%)',      label: 'Crítico',
    badge: 'hsl(0 75% 42%)',     badgeText: '#fff',
    titleColor: 'hsl(0 30% 95%)',bodyColor: 'hsl(0 20% 75%)',
  },
  atencao:     {
    bg: 'hsl(35 55% 14%)',       border: 'hsl(38 90% 52%)',
    icon: 'hsl(38 95% 68%)',     label: 'Atenção',
    badge: 'hsl(38 88% 42%)',    badgeText: '#fff',
    titleColor: 'hsl(38 30% 95%)',bodyColor: 'hsl(38 20% 72%)',
  },
  oportunidade:{
    bg: 'hsl(142 40% 12%)',      border: 'hsl(142 65% 42%)',
    icon: 'hsl(142 70% 60%)',    label: 'Oportunidade',
    badge: 'hsl(142 60% 32%)',   badgeText: '#fff',
    titleColor: 'hsl(142 20% 95%)',bodyColor: 'hsl(142 15% 70%)',
  },
  info:        {
    bg: 'hsl(217 48% 15%)',      border: 'hsl(217 85% 58%)',
    icon: 'hsl(217 91% 74%)',    label: 'Info',
    badge: 'hsl(217 75% 42%)',   badgeText: '#fff',
    titleColor: 'hsl(217 20% 95%)',bodyColor: 'hsl(217 18% 72%)',
  },
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

// ─── Difficulty Score ─────────────────────────────────────────────────────────
// Score = (criticos * 3 + atencao * 2 + info * 1) / total — penalises unresolved high-severity
function difficultyScore(alertsForCoord: DbAlert[]) {
  if (!alertsForCoord.length) return 0;
  const open = alertsForCoord.filter(a => a.status !== 'resolvido');
  const weighted = open.reduce((acc, a) => {
    if (a.level === 'critico') return acc + 3;
    if (a.level === 'atencao') return acc + 2;
    return acc + 1;
  }, 0);
  const resolutionRate = alertsForCoord.filter(a => a.status === 'resolvido').length / alertsForCoord.length;
  // score 0–100 (higher = more difficulty)
  return Math.min(100, Math.round((weighted / alertsForCoord.length) * 33 + (1 - resolutionRate) * 67));
}

function difficultyLabel(score: number): { label: string; color: string; bg: string; icon: typeof Minus } {
  if (score >= 70) return { label: 'Atenção Crítica', color: 'hsl(0 90% 72%)', bg: 'hsl(0 55% 18%)', icon: TrendingDown };
  if (score >= 40) return { label: 'Em Dificuldade', color: 'hsl(38 95% 68%)', bg: 'hsl(35 55% 16%)', icon: Minus };
  return { label: 'Bom Desempenho', color: 'hsl(142 70% 60%)', bg: 'hsl(142 40% 14%)', icon: TrendingUp };
}

function feedbackMessage(score: number, name: string): string {
  if (score >= 70) return `${name} tem alta concentração de alertas críticos em aberto. Recomenda-se contato imediato, revisão do plano de ação e possível reforço de equipe na região.`;
  if (score >= 40) return `${name} apresenta dificuldade moderada. Sugere-se priorizar resolução dos alertas de atenção e revisar o cronograma de visitas territoriais.`;
  return `${name} está gerenciando bem sua região. Manter frequência de ações e replicar boas práticas em outras regiões.`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1 truncate max-w-[160px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

// ─── Analytics Section ────────────────────────────────────────────────────────
function AlertsAnalytics({ alerts, members }: {
  alerts: DbAlert[];
  members: import('@/types/database').DbCampaignMember[];
}) {
  const [rankingExpanded, setRankingExpanded] = useState(false);

  // 1. City distribution (top 10)
  const cityData = useMemo(() => {
    const counts: Record<string, { total: number; critico: number; atencao: number }> = {};
    for (const a of alerts) {
      const city = a.territory ?? 'Não identificado';
      if (!counts[city]) counts[city] = { total: 0, critico: 0, atencao: 0 };
      counts[city].total++;
      if (a.level === 'critico') counts[city].critico++;
      if (a.level === 'atencao') counts[city].atencao++;
    }
    return Object.entries(counts)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [alerts]);

  // 2. Regional coordinators
  const regionalMembers = useMemo(() =>
    members.filter(m => {
      const r = m.role.toLowerCase();
      return m.hierarchy_level === 3 || (r.includes('regional') && !r.includes('microrregional'));
    }), [members]);

  const regionalData = useMemo(() => {
    return regionalMembers.map(coord => {
      const coordAlerts = alerts.filter(a => a.macroregion_id === coord.macroregion_id);
      return {
        name: coord.name.split(' ').slice(0, 2).join(' '),
        fullName: coord.name,
        total: coordAlerts.length,
        critico: coordAlerts.filter(a => a.level === 'critico').length,
        atencao: coordAlerts.filter(a => a.level === 'atencao').length,
        resolvido: coordAlerts.filter(a => a.status === 'resolvido').length,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [alerts, regionalMembers]);

  // 3. Microregional coordinators
  const microMembers = useMemo(() =>
    members.filter(m => {
      const r = m.role.toLowerCase();
      return m.hierarchy_level === 4 || r.includes('microrregional') || r.includes('municipal');
    }), [members]);

  const microData = useMemo(() => {
    return microMembers.map(coord => {
      const coordAlerts = alerts.filter(a =>
        (a.macroregion_id && a.macroregion_id === coord.macroregion_id)
      );
      return {
        name: coord.name.split(' ').slice(0, 2).join(' '),
        fullName: coord.name,
        total: coordAlerts.length,
        critico: coordAlerts.filter(a => a.level === 'critico').length,
        atencao: coordAlerts.filter(a => a.level === 'atencao').length,
        resolvido: coordAlerts.filter(a => a.status === 'resolvido').length,
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [alerts, microMembers]);

  // 4. Performance ranking (all coordinators with alerts)
  const ranking = useMemo(() => {
    const allCoords = [
      ...regionalMembers.map(m => ({ ...m, coordType: 'Regional' as const })),
      ...microMembers.map(m => ({ ...m, coordType: 'Microrregional' as const })),
    ];
    return allCoords.map(coord => {
      const coordAlerts = alerts.filter(a => a.macroregion_id === coord.macroregion_id);
      const score = difficultyScore(coordAlerts);
      return { coord, alerts: coordAlerts, score, diff: difficultyLabel(score) };
    })
      .filter(r => r.alerts.length > 0)
      .sort((a, b) => b.score - a.score);
  }, [alerts, regionalMembers, microMembers]);

  const visibleRanking = rankingExpanded ? ranking : ranking.slice(0, 5);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* City chart */}
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Alertas por Cidade</span>
            <span className="ml-auto text-[10px] text-muted-foreground">top 10</span>
          </div>
          {cityData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sem dados de território</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cityData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 22%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 13% 55%)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(213 20% 75%)' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="critico" name="Críticos" stackId="a" fill="hsl(0 75% 42%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="atencao" name="Atenção" stackId="a" fill="hsl(38 88% 42%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="total" name="Total" fill="hsl(217 75% 42%)" radius={[0, 3, 3, 0]}
                  hide={cityData.every(d => d.critico + d.atencao >= d.total)} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Regional coordinators chart */}
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full" style={{ background: 'hsl(0 75% 52%)' }} />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Coord. Regionais</span>
            <span className="ml-auto text-[10px] text-muted-foreground">volume</span>
          </div>
          {regionalData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sem dados de coordenadores regionais</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionalData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 22%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(213 20% 75%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 13% 55%)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="critico" name="Críticos" stackId="a" fill="hsl(0 75% 42%)" />
                <Bar dataKey="atencao" name="Atenção" stackId="a" fill="hsl(38 88% 42%)" />
                <Bar dataKey="resolvido" name="Resolvidos" fill="hsl(142 60% 32%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Microregional coordinators chart */}
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full" style={{ background: 'hsl(38 90% 52%)' }} />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Coord. Microrregionais</span>
            <span className="ml-auto text-[10px] text-muted-foreground">volume</span>
          </div>
          {microData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sem dados de coordenadores microrregionais</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={microData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 22%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(213 20% 75%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 13% 55%)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="critico" name="Críticos" stackId="a" fill="hsl(0 75% 42%)" />
                <Bar dataKey="atencao" name="Atenção" stackId="a" fill="hsl(38 88% 42%)" />
                <Bar dataKey="resolvido" name="Resolvidos" fill="hsl(142 60% 32%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Performance ranking */}
      {ranking.length > 0 && (
        <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-amber" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Ranking de Desempenho — Coordenadores</span>
              <span className="text-[10px] text-muted-foreground ml-1">· índice de dificuldade na gestão</span>
            </div>
            {ranking.length > 5 && (
              <button
                onClick={() => setRankingExpanded(p => !p)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {rankingExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {rankingExpanded ? 'Ver menos' : `Ver todos (${ranking.length})`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleRanking.map((item, idx) => {
              const { diff, score, coord, alerts: coordAlerts } = item;
              const Icon = diff.icon;
              const open = coordAlerts.filter(a => a.status !== 'resolvido').length;
              const resolved = coordAlerts.filter(a => a.status === 'resolvido').length;
              const critCount = coordAlerts.filter(a => a.level === 'critico').length;
              return (
                <div
                  key={coord.id}
                  className="rounded-lg border p-3 flex items-start gap-3"
                  style={{ backgroundColor: diff.bg, borderColor: `${diff.color}30` }}
                >
                  {/* Rank */}
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                    style={{ backgroundColor: `${diff.color}20`, color: diff.color }}>
                    {idx + 1}
                  </div>

                  {/* Icon */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${diff.color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: diff.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-foreground">{coord.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${diff.color}20`, color: diff.color }}>
                        {coord.coordType}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{coord.role}</span>
                    </div>

                    {/* Feedback message */}
                    <p className="text-[11px] leading-relaxed mb-2" style={{ color: diff.color === 'hsl(142 70% 60%)' ? 'hsl(142 15% 70%)' : diff.color === 'hsl(38 95% 68%)' ? 'hsl(38 20% 72%)' : 'hsl(0 20% 75%)' }}>
                      {feedbackMessage(score, coord.name.split(' ')[0])}
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[10px] flex-wrap">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        Total: <b className="text-foreground">{coordAlerts.length}</b>
                      </span>
                      {critCount > 0 && (
                        <span className="flex items-center gap-1" style={{ color: 'hsl(0 90% 72%)' }}>
                          <AlertOctagon className="w-2.5 h-2.5" />
                          <b>{critCount}</b> crítico{critCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="flex items-center gap-1" style={{ color: 'hsl(38 95% 68%)' }}>
                        <b>{open}</b> em aberto
                      </span>
                      <span className="flex items-center gap-1" style={{ color: 'hsl(142 70% 60%)' }}>
                        <CheckCircle className="w-2.5 h-2.5" />
                        <b>{resolved}</b> resolvido{resolved !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Score gauge */}
                  <div className="flex flex-col items-center flex-shrink-0 gap-1">
                    <div className="text-lg font-black" style={{ color: diff.color }}>{score}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">índice</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${diff.color}20`, color: diff.color }}>
                      {diff.label}
                    </span>
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

// ─── Resolution Dialog ────────────────────────────────────────────────────────
function ResolutionDialog({
  open, onClose, onConfirm, targetStatus,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  targetStatus: string;
}) {
  const [note, setNote] = useState('');
  const isResolve = targetStatus === 'resolvido';

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
            {isResolve ? 'Registrar Resolução' : 'Registrar Análise'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isResolve
              ? 'Descreva obrigatoriamente qual ação foi realizada para solucionar este alerta.'
              : 'Descreva obrigatoriamente qual ação foi planejada para tratar este alerta.'}
          </p>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isResolve
              ? 'Ex: Reunião realizada com coordenador regional, redistribuição de equipe aprovada...'
              : 'Ex: Agendada visita ao município para esta semana, responsável definido...'}
            className="min-h-[120px] resize-none"
          />
          {note.trim().length === 0 && (
            <p className="text-xs text-destructive">* Campo obrigatório para atualizar o status.</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!note.trim()}
            onClick={handleSubmit}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────
function AlertRow({ alert, onRead, onStatusChange, members }: {
  alert: DbAlert;
  onRead: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  members: import('@/types/database').DbCampaignMember[];
}) {
  const c = LEVEL_CONFIG[alert.level] ?? LEVEL_CONFIG.info;
  const Icon = levelIcon(alert.level);

  const team = resolveAlertTeam(members, {
    macroregion_id: alert.macroregion_id,
    creatorName: alert.responsible_name ?? undefined,
    creatorRole: alert.responsible_role ?? undefined,
  });

  return (
    <div
      className="rounded-xl border-l-4 border border-opacity-60 p-4 transition-all hover:scale-[1.005] group cursor-pointer"
      style={{ backgroundColor: c.bg, borderLeftColor: c.border, borderColor: `${c.border}55` }}
      onClick={() => !alert.is_read && onRead(alert.id)}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg flex-shrink-0 mt-0.5" style={{ backgroundColor: `${c.badge}33` }}>
          <Icon className="w-4 h-4" style={{ color: c.icon }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-sm leading-tight" style={{ color: c.titleColor }}>{alert.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: c.badge, color: c.badgeText }}>
                {c.label}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed mb-2" style={{ color: c.bodyColor }}>{alert.description}</p>
          {alert.recommendation && (
            <div className="mb-2 text-xs font-semibold flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ backgroundColor: `${c.badge}25`, color: c.icon, border: `1px solid ${c.border}40` }}>
              <span>💡</span>
              <span>{alert.recommendation}</span>
            </div>
          )}
          {team.length > 0 && (
            <div className="mb-2 pt-2 border-t" style={{ borderColor: `${c.border}40` }}>
              <ResponsibleChain entries={team} compact />
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-[11px]" style={{ color: c.bodyColor }}>
              {alert.territory && (
                <span className="flex items-center gap-1"><span>📍</span>{alert.territory}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(alert.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: `${c.badge}30`, color: c.icon, border: `1px solid ${c.border}60` }}>
                {STATUS_LABEL[alert.status] ?? alert.status}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {alert.status === 'novo' && (
                <button onClick={e => { e.stopPropagation(); onStatusChange(alert.id, 'em_analise'); }}
                  className="text-[10px] px-2.5 py-1 rounded-md font-semibold transition-colors"
                  style={{ backgroundColor: `${c.badge}30`, color: c.icon }}>
                  Em Análise
                </button>
              )}
              {alert.status !== 'resolvido' && (
                <button onClick={e => { e.stopPropagation(); onStatusChange(alert.id, 'resolvido'); }}
                  className="text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold"
                  style={{ backgroundColor: 'hsl(142 60% 28%)', color: 'hsl(142 70% 70%)' }}>
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

  const confirmStatusChange = (note: string) => {
    if (!pendingUpdate) return;
    updateStatus.mutate({ id: pendingUpdate.id, status: pendingUpdate.status as any, resolution_note: note } as any);
    setPendingUpdate(null);
  };

  const criticos = allAlerts.filter(a => a.level === 'critico').length;
  const atencao = allAlerts.filter(a => a.level === 'atencao').length;
  const oportunidades = allAlerts.filter(a => a.level === 'oportunidade').length;
  const unread = allAlerts.filter(a => !a.is_read).length;

  const markAllRead = () => allAlerts.filter(a => !a.is_read).forEach(a => markRead.mutate(a.id));

  return (
    <div className="h-full flex flex-col">
      <ResolutionDialog
        open={!!pendingUpdate}
        onClose={() => setPendingUpdate(null)}
        onConfirm={confirmStatusChange}
        targetStatus={pendingUpdate?.status ?? ''}
      />

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
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5" />
              Marcar todos lidos
            </button>
          )}
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-xs font-medium text-muted-foreground">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Gerando...' : 'Gerar Alertas'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={criticos} label="Críticos" color="hsl(var(--brand-red))" icon={AlertTriangle} />
          <StatCard value={atencao} label="Atenção" color="hsl(var(--brand-amber))" icon={Bell} />
          <StatCard value={oportunidades} label="Oportunidades" color="hsl(var(--brand-green))" icon={Zap} />
          <StatCard value={unread} label="Não lidos" color="hsl(var(--primary))" icon={Activity} />
        </div>

        {/* Analytics + Ranking */}
        {!isLoading && <AlertsAnalytics alerts={allAlerts} members={members} />}

        {/* Filters */}
        <div className="rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center" style={{ background: 'var(--gradient-card)' }}>
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou território..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'critico', 'atencao', 'oportunidade', 'info'] as Level[]).map(l => (
              <button key={l} onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${levelFilter === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {l === 'all' ? 'Todos Níveis' : LEVEL_CONFIG[l]?.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'novo', 'em_analise', 'resolvido'] as Status[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {s === 'all' ? 'Todos Status' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Alert list */}
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
                className="mt-3 text-xs text-primary hover:underline">Limpar filtros</button>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground px-1 mb-1">
                {filtered.length} alerta{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </div>
              {filtered.map(alert => (
                <AlertRow key={alert.id} alert={alert}
                  onRead={id => markRead.mutate(id)}
                  onStatusChange={(id, status) => setPendingUpdate({ id, status })}
                  members={members} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
