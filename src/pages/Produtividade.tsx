import { useMemo, useState } from 'react';
import { TrendingUp, Users, Target, Award, Trophy, Activity, Crown, Map as MapIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import { useProductivity, type ProductivityRow } from '@/hooks/useProductivity';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { scoreColor, scoreLabel } from '@/lib/impactScore';
import { ProductivityDetailDialog } from '@/components/produtividade/ProductivityDetailDialog';

type LevelKind = 'macro' | 'micro' | 'leader';

const PERIODS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 0, label: 'Tudo' },
];

function KpiCard({ icon: Icon, label, value, hint, color }: any) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4" style={{ color }} />
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function RankingTable({
  rows,
  metric,
  emptyHint,
  showLeaderCount,
  level,
  onSelect,
}: {
  rows: ProductivityRow[];
  metric: 'total' | 'efficiency';
  emptyHint: string;
  showLeaderCount?: boolean;
  level: LevelKind;
  onSelect: (row: ProductivityRow, level: LevelKind) => void;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) =>
      metric === 'total'
        ? b.total_score - a.total_score
        : (b.efficiency_score ?? 0) - (a.efficiency_score ?? 0),
    ),
    [rows, metric],
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
        {emptyHint}
      </div>
    );
  }

  const max = Math.max(
    1,
    ...sorted.map(r => (metric === 'total' ? r.total_score : r.efficiency_score ?? 0)),
  );

  return (
    <div className="space-y-2">
      {sorted.map((r, idx) => {
        const value = metric === 'total' ? r.total_score : (r.efficiency_score ?? 0);
        const widthPct = metric === 'efficiency' ? value : (value / max) * 100;
        const barColor = metric === 'efficiency' ? scoreColor(value) : scoreColor(r.avg_score);
        return (
          <Card
            key={r.id}
            className="p-3 bg-card border-border cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
            onClick={() => onSelect(r, level)}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                   style={{
                     background: idx === 0 ? 'rgba(245,158,11,0.2)' : 'var(--muted)',
                     color: idx === 0 ? '#F59E0B' : 'var(--muted-foreground)',
                     border: idx === 0 ? '1px solid #F59E0B' : '1px solid var(--border)',
                   }}>
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate">{r.name ?? 'Sem nome'}</div>
                  {r.kind === 'regiao' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      sem coordenador
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{r.action_count} ações</span>
                  {showLeaderCount && r.leader_count != null && <span>{r.leader_count} lideranças</span>}
                  <span>{r.people_impacted.toLocaleString('pt-BR')} pessoas</span>
                  {metric === 'efficiency' ? (
                    <>
                      <span>ações {r.actions_score ?? 0}</span>
                      <span>velocidade {r.speed_score ?? 0}</span>
                      <span>ativos {r.active_score ?? 0}</span>
                      {(r.active_count ?? 0) > 0 && (
                        <span>{r.active_count} ativos · {r.avg_lead_days}d antec.</span>
                      )}
                    </>
                  ) : (
                    <span>média {r.avg_score} · {scoreLabel(r.avg_score)}</span>
                  )}
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${widthPct}%`, background: barColor }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold">{value}</div>
                <div className="text-[10px] text-muted-foreground">
                  {metric === 'total' ? 'total' : 'eficiência'}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function Produtividade() {
  const { roles, loading } = useAuth();
  const { activeCandidate } = useCandidate();
  const [period, setPeriod] = useState(30);
  const [metric, setMetric] = useState<'total' | 'efficiency'>('total');

  const isAdminMaster = roles.includes('admin_master' as any);

  const { data, isLoading } = useProductivity(activeCandidate?.id ?? null, period);

  if (loading) return null;
  if (!isAdminMaster) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Produtividade Hierárquica
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranking de impacto de campo · liderança → coordenador micro → coordenador macro
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIODS.map(p => (
              <button key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['total', 'efficiency'] as const).map(m => (
              <button key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  metric === m ? 'bg-secondary text-secondary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}>
                {m === 'total' ? 'Volume' : 'Eficiência'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-center py-20 text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Activity} label="Ações pontuadas" value={data.totals.action_count} color="#5BA0FF" />
            <KpiCard icon={Target} label="Score total" value={data.totals.total_score.toLocaleString('pt-BR')} color="#2FA85A" />
            <KpiCard icon={TrendingUp} label="Score médio" value={data.totals.avg_score} hint={scoreLabel(data.totals.avg_score)} color="#F59E0B" />
            <KpiCard icon={Users} label="Pessoas impactadas" value={data.totals.people_impacted.toLocaleString('pt-BR')} color="#A78BFA" />
          </div>

          <Tabs defaultValue="macros" className="w-full">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="macros" className="gap-1.5"><Crown className="w-3.5 h-3.5" />Macros</TabsTrigger>
              <TabsTrigger value="micros" className="gap-1.5"><MapIcon className="w-3.5 h-3.5" />Micros</TabsTrigger>
              <TabsTrigger value="leaders" className="gap-1.5"><Award className="w-3.5 h-3.5" />Lideranças</TabsTrigger>
            </TabsList>

            <TabsContent value="macros" className="mt-4">
              <RankingTable
                rows={data.macros}
                metric={metric}
                showLeaderCount
                emptyHint="Sem ações pontuadas no período para o nível macro."
              />
            </TabsContent>
            <TabsContent value="micros" className="mt-4">
              <RankingTable
                rows={data.micros}
                metric={metric}
                showLeaderCount
                emptyHint="Sem coordenadores micro com ações pontuadas no período."
              />
            </TabsContent>
            <TabsContent value="leaders" className="mt-4">
              <RankingTable
                rows={data.leaders}
                metric={metric}
                emptyHint="Sem lideranças com ações pontuadas no período."
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
