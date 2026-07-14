import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Target, TrendingUp, Activity, X, MapPin, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import { useAssignableTeam, type TeamMember } from '@/hooks/useAssignableTeam';
import { supabase } from '@/integrations/supabase/client';
import { scoreColor, scoreLabel } from '@/lib/impactScore';

const PERIODS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 0, label: 'Tudo' },
];

interface TeamAction {
  id: string;
  created_by: string;
  impact_score: number | null;
  executed_people_count: number | null;
  planned_date: string | null;
  created_at: string;
  title: string | null;
  municipality: string | null;
}

interface AggregatedMember extends TeamMember {
  action_count: number;
  total_score: number;
  avg_score: number;
  people_impacted: number;
  last_action_at: string | null;
}

export default function CampoProdutividade() {
  const { activeCandidate } = useCandidate();
  const { user } = useAuth();
  const [period, setPeriod] = useState(30);
  const [selected, setSelected] = useState<AggregatedMember | null>(null);

  const { data: team = [], isLoading: teamLoading } = useAssignableTeam(activeCandidate?.id ?? null);

  const teamUserIds = useMemo(
    () => Array.from(new Set(team.map(m => m.user_id).filter(Boolean) as string[])),
    [team],
  );

  const cutoff = useMemo(() => {
    if (!period) return null;
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d.toISOString();
  }, [period]);

  const { data: actions = [], isLoading: actionsLoading } = useQuery<TeamAction[]>({
    queryKey: ['campo-produtividade-actions', teamUserIds, cutoff, activeCandidate?.id],
    enabled: teamUserIds.length > 0,
    queryFn: async () => {
      let q = (supabase as any)
        .from('actions')
        .select('id, created_by, impact_score, executed_people_count, planned_date, created_at, title, municipality')
        .is('deleted_at', null)
        .in('created_by', teamUserIds);
      if (cutoff) q = q.gte('created_at', cutoff);
      if (activeCandidate?.id) q = q.eq('candidate_id', activeCandidate.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TeamAction[];
    },
  });

  const aggregated: AggregatedMember[] = useMemo(() => {
    const byUser = new Map<string, TeamAction[]>();
    actions.forEach(a => {
      const arr = byUser.get(a.created_by) ?? [];
      arr.push(a);
      byUser.set(a.created_by, arr);
    });
    return team
      .map(m => {
        const acts = m.user_id ? (byUser.get(m.user_id) ?? []) : [];
        const scored = acts.filter(a => a.impact_score != null);
        const total = scored.reduce((s, a) => s + (a.impact_score ?? 0), 0);
        const people = acts.reduce((s, a) => s + (a.executed_people_count ?? 0), 0);
        const last = acts.reduce<string | null>((max, a) => {
          const d = a.created_at;
          return !max || d > max ? d : max;
        }, null);
        return {
          ...m,
          action_count: acts.length,
          total_score: total,
          avg_score: scored.length ? Math.round(total / scored.length) : 0,
          people_impacted: people,
          last_action_at: last,
        };
      })
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        if (b.action_count !== a.action_count) return b.action_count - a.action_count;
        return (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR');
      });
  }, [team, actions]);

  const totals = useMemo(() => {
    const scored = actions.filter(a => a.impact_score != null);
    const total = scored.reduce((s, a) => s + (a.impact_score ?? 0), 0);
    return {
      action_count: actions.length,
      members: aggregated.filter(m => m.action_count > 0).length,
      total_score: total,
      avg_score: scored.length ? Math.round(total / scored.length) : 0,
      people_impacted: actions.reduce((s, a) => s + (a.executed_people_count ?? 0), 0),
    };
  }, [actions, aggregated]);

  const selectedActions = useMemo(() => {
    if (!selected) return [];
    return actions
      .filter(a => a.created_by === selected.user_id)
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  }, [selected, actions]);

  const isLoading = teamLoading || actionsLoading;
  const max = Math.max(1, ...aggregated.map(m => m.total_score));

  return (
    <div className="campo-screen">
      <div className="campo-page-header">
        <Link to="/campo" className="campo-icon-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(245,179,66,0.15)', border: '1px solid rgba(245,179,66,0.35)' }}
        >
          <Trophy className="w-4 h-4" style={{ color: '#F5B342' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1>Produtividade da Equipe</h1>
          <p>Ranking do seu time · toque em um membro para detalhar</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-4 pb-24">
        {/* Period filter */}
        <div className="flex rounded-lg border border-border overflow-hidden w-fit">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Users, label: 'Ativos', value: totals.members, color: '#5BA0FF' },
            { icon: Activity, label: 'Ações', value: totals.action_count, color: '#2FA85A' },
            { icon: Target, label: 'Score total', value: totals.total_score.toLocaleString('pt-BR'), color: '#F5B342' },
            { icon: TrendingUp, label: 'Pessoas', value: totals.people_impacted.toLocaleString('pt-BR'), color: '#A78BFA' },
          ].map(k => (
            <div key={k.label} className="campo-card p-4">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--campo-text-mute)' }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} /> {k.label}
              </div>
              <div className="text-2xl font-bold text-white mt-1">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Ranking */}
        <div>
          <h3 className="campo-h2 mb-2 flex items-center gap-2">
            <Award className="w-4 h-4" /> Ranking da equipe
          </h3>
          {isLoading ? (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--campo-text-mute)' }}>Carregando…</div>
          ) : aggregated.length === 0 ? (
            <div className="text-center py-10 text-sm border border-dashed border-border rounded-lg" style={{ color: 'var(--campo-text-mute)' }}>
              Nenhum membro na sua equipe ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {aggregated.map((m, idx) => {
                const widthPct = (m.total_score / max) * 100;
                const barColor = scoreColor(m.avg_score);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="w-full text-left campo-card p-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: idx === 0 ? 'rgba(245,179,66,0.2)' : 'rgba(255,255,255,0.06)',
                          color: idx === 0 ? '#F5B342' : 'var(--campo-text-mute)',
                          border: idx === 0 ? '1px solid #F5B342' : '1px solid var(--campo-line)',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                        <div className="text-[11px] mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--campo-text-mute)' }}>
                          <span>{m.role ?? '—'}</span>
                          <span>{m.action_count} ações</span>
                          <span>{m.people_impacted.toLocaleString('pt-BR')} pessoas</span>
                          {m.avg_score > 0 && <span>média {m.avg_score} · {scoreLabel(m.avg_score)}</span>}
                        </div>
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, background: barColor }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-white">{m.total_score}</div>
                        <div className="text-[10px]" style={{ color: 'var(--campo-text-faint)' }}>score</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drill-down sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--campo-surface)', border: '1px solid var(--campo-line)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--campo-line)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{selected.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--campo-text-mute)' }}>
                  {selected.role ?? '—'} {selected.municipality ? `· ${selected.municipality}` : ''}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="campo-icon-btn">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-auto">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Ações', value: selected.action_count },
                  { label: 'Score total', value: selected.total_score },
                  { label: 'Score médio', value: selected.avg_score },
                  { label: 'Pessoas', value: selected.people_impacted.toLocaleString('pt-BR') },
                ].map(k => (
                  <div key={k.label} className="campo-card p-3">
                    <div className="text-[10px]" style={{ color: 'var(--campo-text-mute)' }}>{k.label}</div>
                    <div className="text-xl font-bold text-white mt-0.5">{k.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="campo-h2 mb-2">Ações do período</h4>
                {selectedActions.length === 0 ? (
                  <div className="text-center py-6 text-xs border border-dashed border-border rounded-lg" style={{ color: 'var(--campo-text-mute)' }}>
                    Sem ações registradas no período.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedActions.map(a => (
                      <div key={a.id} className="campo-card p-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate">{a.title || 'Ação sem título'}</div>
                            <div className="text-[10px] flex items-center gap-2 mt-0.5" style={{ color: 'var(--campo-text-mute)' }}>
                              {a.municipality && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {a.municipality}
                                </span>
                              )}
                              <span>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                              {a.executed_people_count != null && <span>{a.executed_people_count} pessoas</span>}
                            </div>
                          </div>
                          {a.impact_score != null && (
                            <div className="flex-shrink-0 text-right">
                              <div className="text-sm font-bold" style={{ color: scoreColor(a.impact_score) }}>{a.impact_score}</div>
                              <div className="text-[9px]" style={{ color: 'var(--campo-text-faint)' }}>{scoreLabel(a.impact_score)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
