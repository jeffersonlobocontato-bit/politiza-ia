import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Activity, Target, Users, MapPin, Zap, Calendar } from 'lucide-react';
import { scoreColor, scoreLabel } from '@/lib/impactScore';
import type { ProductivityRow } from '@/hooks/useProductivity';
import ActionDetailSheet from '@/components/campo/ActionDetailSheet';

type Level = 'macro' | 'micro' | 'leader';

const DEADLINE = new Date('2026-10-04T00:00:00Z');

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: ProductivityRow | null;
  level: Level;
  candidateId: string | null;
  periodDays: number;
}

interface ActionRow {
  id: string;
  title: string;
  municipality: string | null;
  planned_date: string;
  executed_date: string | null;
  executed_people_count: number | null;
  impact_score: number | null;
  status: string;
  type: string;
}

interface MemberRow {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  supervisor_id: string | null;
  hierarchy_level: number | null;
}

export function ProductivityDetailDialog({ open, onOpenChange, row, level, candidateId, periodDays }: Props) {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setActions([]);
      try {
        // Resolve executor user ids from campaign_members, matching the backend ranking.
        const creatorIds = new Set<string>();

        let membersQuery = supabase
          .from('campaign_members')
          .select('id,user_id,email,name,supervisor_id,hierarchy_level,candidate_id,status')
          .eq('status', 'ativo')
          .gte('hierarchy_level', 3)
          .lte('hierarchy_level', 6);
        if (candidateId) {
          membersQuery = membersQuery.or(`candidate_id.is.null,candidate_id.eq.${candidateId}`);
        }
        const { data: allMembers, error: membersError } = await membersQuery;
        if (membersError) throw membersError;

        const members = ((allMembers as any[]) ?? []) as MemberRow[];
        const selected = members.find(m => m.id === row.id);
        if (!selected) {
          setActions([]);
          setLoading(false);
          return;
        }

        const targetIds = new Set<string>([selected.id]);
        if (level !== 'leader') {
          const queue = [selected.id];
          while (queue.length > 0) {
            const current = queue.shift()!;
            members
              .filter(m => m.supervisor_id === current && !targetIds.has(m.id))
              .forEach(child => {
                targetIds.add(child.id);
                queue.push(child.id);
              });
          }
        }

        const targetMembers = members.filter(m => targetIds.has(m.id));
        targetMembers.forEach(m => {
          if (m.user_id) creatorIds.add(m.user_id);
        });

        const missingUserMembers = targetMembers.filter(m => !m.user_id && (m.email || m.name));
        if (missingUserMembers.length > 0) {
          let pq = supabase.from('profiles').select('id,email,full_name');
          const filters = missingUserMembers.flatMap(m => {
            const parts: string[] = [];
            if (m.email) parts.push(`email.ilike.${m.email}`);
            if (m.name) parts.push(`full_name.ilike.${m.name}`);
            return parts;
          });
          if (filters.length) {
            pq = pq.or(filters.join(','));
            const { data: profs } = await pq;
            profs?.forEach((p: any) => p?.id && creatorIds.add(p.id));
          }
        }

        if (creatorIds.size === 0) {
          setActions([]);
          setLoading(false);
          return;
        }

        let q = supabase
          .from('actions')
          .select('id,title,municipality,planned_date,executed_date,executed_people_count,impact_score,status,type,created_at')
          .is('deleted_at', null)
          .eq('status', 'realizada')
          .not('impact_score', 'is', null)
          .in('created_by', Array.from(creatorIds));
        if (candidateId) q = q.eq('candidate_id', candidateId);
        if (periodDays && periodDays > 0) {
          const cutoff = new Date(Date.now() - periodDays * 86400000).toISOString();
          q = q.gte('created_at', cutoff);
        }
        const { data, error } = await q.order('planned_date', { ascending: false });
        if (error) throw error;
        if (!cancelled) setActions((data as any) ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erro ao carregar detalhes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row, level, candidateId, periodDays]);

  const stats = useMemo(() => {
    const total = actions.length;
    const cities = new Set(actions.map(a => a.municipality).filter(Boolean)).size;
    const people = actions.reduce((s, a) => s + (a.executed_people_count ?? 0), 0);
    const totalScore = actions.reduce((s, a) => s + (a.impact_score ?? 0), 0);
    const avgScore = total ? Math.round(totalScore / total) : 0;
    const executed = actions.filter(a => a.status === 'realizada').length;
    const firstDate = actions.reduce<string | null>((min, a) => {
      const d = a.executed_date ?? a.planned_date;
      if (!d) return min;
      return !min || d < min ? d : min;
    }, null);
    const leadDays = firstDate
      ? Math.max(0, Math.round((DEADLINE.getTime() - new Date(firstDate).getTime()) / 86400000))
      : 0;
    return { total, cities, people, totalScore, avgScore, executed, firstDate, leadDays };
  }, [actions]);

  const byCity = useMemo(() => {
    const m = new Map<string, { count: number; people: number }>();
    actions.forEach(a => {
      const key = a.municipality ?? 'Sem cidade';
      const cur = m.get(key) ?? { count: 0, people: 0 };
      cur.count += 1;
      cur.people += a.executed_people_count ?? 0;
      m.set(key, cur);
    });
    return Array.from(m.entries())
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [actions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row?.name ?? 'Detalhes'}
            <span className="text-[11px] font-normal text-muted-foreground uppercase tracking-wide">
              {level === 'macro' ? 'Coordenador macro' : level === 'micro' ? 'Coordenador micro' : 'Liderança'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniKpi icon={Activity} label="Ações" value={stats.total} hint={`${stats.executed} realizadas`} color="#5BA0FF" />
              <MiniKpi icon={MapPin} label="Cidades" value={stats.cities} color="#F59E0B" />
              <MiniKpi icon={Users} label="Pessoas impactadas" value={stats.people.toLocaleString('pt-BR')} color="#A78BFA" />
              <MiniKpi
                icon={Zap}
                label="Antecedência"
                value={stats.firstDate ? `${stats.leadDays}d` : '—'}
                hint={stats.firstDate ? `1ª ação ${formatDate(stats.firstDate)}` : 'Sem ações'}
                color="#2FA85A"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MiniKpi icon={Target} label="Score total" value={stats.totalScore} color="#2FA85A" />
              <MiniKpi
                icon={TrendIcon}
                label="Score médio"
                value={stats.avgScore}
                hint={scoreLabel(stats.avgScore)}
                color={scoreColor(stats.avgScore)}
              />
              <MiniKpi icon={Calendar} label="Deadline" value="04/10/2026" color="#EF4444" />
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cidades atendidas</div>
              {byCity.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  Nenhuma cidade registrada.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {byCity.map(c => (
                    <div key={c.city} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 border border-border">
                      <div className="text-sm truncate">{c.city}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {c.count} ações · {c.people.toLocaleString('pt-BR')} pessoas
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ações registradas</div>
              {actions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                  Nenhuma ação registrada neste período.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {actions.map(a => (
                    <Card
                      key={a.id}
                      className="p-3 bg-card border-border cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedActionId(a.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{a.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                            <span>{a.municipality ?? 'Sem cidade'}</span>
                            <span>{formatDate(a.executed_date ?? a.planned_date)}</span>
                            <span>{(a.executed_people_count ?? 0).toLocaleString('pt-BR')} pessoas</span>
                            <span className="capitalize">{a.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-base font-bold" style={{ color: scoreColor(a.impact_score ?? 0) }}>
                            {a.impact_score ?? 0}
                          </div>
                          <div className="text-[10px] text-muted-foreground">score</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
      <ActionDetailSheet
        actionId={selectedActionId}
        onClose={() => setSelectedActionId(null)}
        onDelete={() => {
          setSelectedActionId(null);
          setActions(prev => prev.filter(a => a.id !== selectedActionId));
        }}
      />
    </Dialog>
  );
}

function MiniKpi({ icon: Icon, label, value, hint, color }: any) {
  return (
    <Card className="p-3 bg-card border-border">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function TrendIcon(props: any) {
  return <Activity {...props} />;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}
