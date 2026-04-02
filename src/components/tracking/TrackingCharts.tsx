import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  Users, MapPin, BarChart3, TrendingUp, Target, Percent,
} from 'lucide-react';

interface Interview {
  id: string;
  round_id: string;
  municipality: string | null;
  microregion: string | null;
  respondent_age_range: string | null;
  respondent_gender: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

interface Answer {
  id: string;
  interview_id: string;
  question_key: string;
  answer_value: string;
  candidate_name: string | null;
}

interface Question {
  question_key: string;
  label: string;
  question_type: string;
  options: any;
}

interface Round {
  id: string;
  title: string;
  city: string | null;
  start_date: string;
}

interface Props {
  rounds: Round[];
  interviews: Interview[];
  answers: Answer[];
  questions: Question[];
  selectedRoundId: string | null;
  onRoundChange: (id: string | null) => void;
  filters: {
    city: string;
    neighborhood: string;
    interviewer: string;
  };
  onFiltersChange: (f: any) => void;
}

const CHART_COLORS = [
  '#0FFCBE', '#106EBE', '#7B61FF', '#FBC02D', '#E53935',
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c',
];

const GRADIENT_CARDS = [
  { bg: 'from-[hsl(210,84%,30%)] to-[hsl(210,84%,45%)]', icon: 'text-blue-200' },
  { bg: 'from-[hsl(163,97%,35%)] to-[hsl(163,60%,45%)]', icon: 'text-emerald-200' },
  { bg: 'from-[hsl(280,70%,45%)] to-[hsl(310,60%,50%)]', icon: 'text-purple-200' },
  { bg: 'from-[hsl(210,84%,25%)] to-[hsl(220,60%,40%)]', icon: 'text-cyan-200' },
];

function KpiCard({ title, value, subtitle, icon: Icon, gradientIndex }: {
  title: string; value: string | number; subtitle?: string; icon: any; gradientIndex: number;
}) {
  const g = GRADIENT_CARDS[gradientIndex % GRADIENT_CARDS.length];
  return (
    <div className={`relative rounded-xl bg-gradient-to-br ${g.bg} p-5 overflow-hidden shadow-lg`}>
      <div className="absolute top-3 right-3 opacity-20">
        <Icon className={`w-12 h-12 ${g.icon}`} />
      </div>
      <p className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-white">{value}</p>
      {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-[hsl(220,20%,13%)] border border-[hsl(220,15%,20%)] shadow-lg overflow-hidden ${className}`}>
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'hsl(220, 18%, 16%)',
  border: '1px solid hsl(220, 15%, 25%)',
  borderRadius: 10,
  fontSize: 12,
  color: '#fff',
};

export function TrackingCharts({ rounds, interviews, answers, questions, selectedRoundId, onRoundChange, filters, onFiltersChange }: Props) {
  const filteredInterviews = useMemo(() => {
    let items = interviews;
    if (selectedRoundId) items = items.filter(i => i.round_id === selectedRoundId);
    if (filters.city) items = items.filter(i => i.municipality === filters.city);
    return items;
  }, [interviews, selectedRoundId, filters.city]);

  const filteredInterviewIds = new Set(filteredInterviews.map(i => i.id));
  const filteredAnswers = useMemo(
    () => answers.filter(a => filteredInterviewIds.has(a.interview_id)),
    [answers, filteredInterviewIds]
  );

  // Find the select question with the most answers (not just the first one)
  const bestSelectKey = useMemo(() => {
    const selectKeys = new Set(
      questions.filter(q => q.question_type === 'select').map(q => q.question_key)
    );
    if (!selectKeys.size) return null;
    let best: string | null = null;
    let bestCount = 0;
    selectKeys.forEach(key => {
      const count = filteredAnswers.filter(a => a.question_key === key).length;
      if (count > bestCount) { bestCount = count; best = key; }
    });
    // If no answers in filtered set, try all answers
    if (!best) {
      selectKeys.forEach(key => {
        const count = answers.filter(a => a.question_key === key).length;
        if (count > bestCount) { bestCount = count; best = key; }
      });
    }
    return best;
  }, [questions, filteredAnswers, answers]);

  const voteIntentionData = useMemo(() => {
    if (!bestSelectKey) return [];
    // Aggregate all select-type question answers (to unify equivalent vote questions)
    const allSelectKeys = new Set(
      questions.filter(q => q.question_type === 'select').map(q => q.question_key)
    );
    const qAnswers = filteredAnswers.filter(a => allSelectKeys.has(a.question_key));
    const counts: Record<string, number> = {};
    qAnswers.forEach(a => {
      const name = a.answer_value || 'Sem resposta';
      counts[name] = (counts[name] || 0) + 1;
    });
    const total = qAnswers.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAnswers, questions, bestSelectKey]);

  const cityComparisonData = useMemo(() => {
    const cities: Record<string, number> = {};
    filteredInterviews.forEach(i => {
      const city = i.municipality || 'Sem cidade';
      cities[city] = (cities[city] || 0) + 1;
    });
    return Object.entries(cities)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredInterviews]);

  const evolutionData = useMemo(() => {
    if (rounds.length < 2) return [];
    const allSelectKeys = new Set(
      questions.filter(q => q.question_type === 'select').map(q => q.question_key)
    );
    if (!allSelectKeys.size) return [];
    return rounds
      .filter(r => interviews.some(i => i.round_id === r.id))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map(round => {
        const roundInterviewIds = new Set(interviews.filter(i => i.round_id === round.id).map(i => i.id));
        const roundAnswers = answers.filter(a => roundInterviewIds.has(a.interview_id) && allSelectKeys.has(a.question_key));
        const total = roundAnswers.length || 1;
        const counts: Record<string, number> = {};
        roundAnswers.forEach(a => { counts[a.answer_value] = (counts[a.answer_value] || 0) + 1; });
        const point: any = { round: round.title?.slice(0, 20) || round.city || 'Rodada' };
        Object.entries(counts).forEach(([name, count]) => {
          point[name] = Math.round((count / total) * 100);
        });
        return point;
      });
  }, [rounds, interviews, answers, questions]);

  const candidateNames = useMemo(() => {
    const names = new Set<string>();
    evolutionData.forEach(d => {
      Object.keys(d).filter(k => k !== 'round').forEach(k => names.add(k));
    });
    return Array.from(names);
  }, [evolutionData]);

  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInterviews.forEach(i => {
      const g = i.respondent_gender || 'Não informado';
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredInterviews]);

  const ageData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInterviews.forEach(i => {
      const a = i.respondent_age_range || 'Não informado';
      counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredInterviews]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(interviews.map(i => i.municipality).filter(Boolean));
    return Array.from(cities) as string[];
  }, [interviews]);

  const gpsCount = filteredInterviews.filter(i => i.lat != null && i.lng != null).length;
  const gpsRate = filteredInterviews.length > 0 ? Math.round((gpsCount / filteredInterviews.length) * 100) : 0;

  const leader = voteIntentionData[0];
  const leaderPct = leader ? `${leader.pct}%` : '—';

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedRoundId || 'all'} onValueChange={v => onRoundChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-52 bg-[hsl(220,15%,14%)] border-[hsl(220,15%,22%)] text-foreground">
            <SelectValue placeholder="Todas as rodadas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as rodadas</SelectItem>
            {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.city || 'all'} onValueChange={v => onFiltersChange({ ...filters, city: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-44 bg-[hsl(220,15%,14%)] border-[hsl(220,15%,22%)] text-foreground">
            <SelectValue placeholder="Todas as cidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center text-xs border-[hsl(220,15%,25%)] text-muted-foreground">
          {filteredInterviews.length} entrevistas · {gpsRate}% GPS
        </Badge>
      </div>

      {filteredInterviews.length === 0 ? (
        <div className="rounded-xl bg-[hsl(220,20%,13%)] border border-dashed border-[hsl(220,15%,25%)] py-16 text-center text-muted-foreground">
          Nenhuma entrevista registrada{selectedRoundId ? ' nesta rodada' : ''}.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Entrevistas"
              value={filteredInterviews.length}
              subtitle={`${gpsRate}% com geolocalização`}
              icon={Users}
              gradientIndex={0}
            />
            <KpiCard
              title="Cidades Cobertas"
              value={uniqueCities.length}
              subtitle={`${cityComparisonData.length} com dados`}
              icon={MapPin}
              gradientIndex={1}
            />
            <KpiCard
              title="Líder"
              value={leaderPct}
              subtitle={leader?.name || '—'}
              icon={TrendingUp}
              gradientIndex={2}
            />
            <KpiCard
              title="Taxa GPS"
              value={`${gpsRate}%`}
              subtitle={`${gpsCount} geolocalizadas`}
              icon={Target}
              gradientIndex={3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vote Intention — horizontal bar with gradient bg */}
            {voteIntentionData.length > 0 && (
              <ChartCard title="Intenção de Voto" className="lg:col-span-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={voteIntentionData} layout="vertical" margin={{ left: 110, right: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#8899aa' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#dde4ec' }} width={105} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: number, _: string, entry: any) => [`${val} (${entry.payload.pct}%)`, 'Votos']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                        {voteIntentionData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.9} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* Evolution — area chart */}
            {evolutionData.length > 1 && (
              <ChartCard title="Evolução por Rodada (%)" className="lg:col-span-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <defs>
                        {candidateNames.map((name, i) => (
                          <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.05} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" />
                      <XAxis dataKey="round" tick={{ fontSize: 10, fill: '#8899aa' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8899aa' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#dde4ec' }} />
                      {candidateNames.map((name, i) => (
                        <Area
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          fill={`url(#grad-${i})`}
                          strokeWidth={2}
                          dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* City comparison — styled table + bars */}
            {cityComparisonData.length > 0 && (
              <ChartCard title="Entrevistas por Cidade">
                <div className="space-y-2 mt-2">
                  {cityComparisonData.map((item, i) => {
                    const maxCount = cityComparisonData[0]?.count || 1;
                    const widthPct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.city} className="flex items-center gap-3">
                        <span className="text-xs text-white/70 w-28 truncate text-right">{item.city}</span>
                        <div className="flex-1 h-5 bg-[hsl(220,15%,18%)] rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all"
                            style={{
                              width: `${widthPct}%`,
                              background: `linear-gradient(90deg, ${CHART_COLORS[i % 5]}, ${CHART_COLORS[i % 5]}88)`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white/90 w-10 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            )}

            {/* Gender — donut */}
            {genderData.length > 0 && (
              <ChartCard title="Gênero dos Entrevistados">
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {genderData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* Age distribution */}
            {ageData.length > 0 && (
              <ChartCard title="Faixa Etária" className="lg:col-span-2">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <defs>
                        <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0FFCBE" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#0FFCBE" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,22%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8899aa' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8899aa' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="url(#ageGrad)" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
