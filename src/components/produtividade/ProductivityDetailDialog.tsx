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
        // Resolve creator user ids to filter actions by
        const creatorIds = new Set<string>();

        if (level === 'leader') {
          const { data: lead } = await supabase
            .from('leaders')
            .select('created_by')
            .eq('id', row.id)
            .maybeSingle();
          if (lead?.created_by) creatorIds.add(lead.created_by);
        } else {
          // macro or micro: row.id is campaign_members.id (unless kind==='regiao')
          if (row.kind === 'regiao') {
            const regionId = row.id.replace(/^region:/, '');
            // fallback: fetch actions by macroregion_id directly
            let q = supabase
              .from('actions')
              .select('id,title,municipality,planned_date,executed_date,executed_people_count,impact_score,status,type,created_at')
              .is('deleted_at', null)
              .eq('macroregion_id', regionId);
            if (candidateId) q = q.eq('candidate_id', candidateId);
            if (periodDays && periodDays > 0) {
              const cutoff = new Date(Date.now() - periodDays * 86400000).toISOString();
              q = q.gte('created_at', cutoff);
            }
            const { data, error } = await q.order('planned_date', { ascending: false });
            if (error) throw error;
            if (!cancelled) setActions((data as any) ?? []);
            setLoading(false);
            return;
          }

          const { data: cm } = await supabase
            .from('campaign_members')
            .select('user_id,email,name')
            .eq('id', row.id)
            .maybeSingle();
          if (cm?.user_id) creatorIds.add(cm.user_id);
          if (cm?.email || cm?.name) {
            let pq = supabase.from('profiles').select('id,email,full_name');
            const filters: string[] = [];
            if (cm.email) filters.push(`email.ilike.${cm.email}`);
            if (cm.name) filters.push(`full_name.ilike.${cm.name}`);
            if (filters.length) pq = pq.or(filters.join(','));
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
                    <Card key={a.id} className="p-3 bg-card border-border">
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
