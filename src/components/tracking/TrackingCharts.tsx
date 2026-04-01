import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

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
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c',
];

export function TrackingCharts({ rounds, interviews, answers, questions, selectedRoundId, onRoundChange, filters, onFiltersChange }: Props) {
  // Filter interviews by round
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

  // Vote intention (select type questions with candidate_name)
  const voteIntentionData = useMemo(() => {
    const selectQs = questions.filter(q => q.question_type === 'select');
    if (!selectQs.length) return [];

    const firstQ = selectQs[0];
    const qAnswers = filteredAnswers.filter(a => a.question_key === firstQ.question_key);
    const counts: Record<string, number> = {};
    qAnswers.forEach(a => {
      const name = a.answer_value || 'Sem resposta';
      counts[name] = (counts[name] || 0) + 1;
    });
    const total = qAnswers.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAnswers, questions]);

  // City comparison
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

  // Evolution by round
  const evolutionData = useMemo(() => {
    if (rounds.length < 2) return [];
    const selectQs = questions.filter(q => q.question_type === 'select');
    if (!selectQs.length) return [];
    const firstQ = selectQs[0];

    return rounds
      .filter(r => interviews.some(i => i.round_id === r.id))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map(round => {
        const roundInterviewIds = new Set(interviews.filter(i => i.round_id === round.id).map(i => i.id));
        const roundAnswers = answers.filter(a => roundInterviewIds.has(a.interview_id) && a.question_key === firstQ.question_key);
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

  // Demographics
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedRoundId || 'all'} onValueChange={v => onRoundChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todas as rodadas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as rodadas</SelectItem>
            {rounds.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.city || 'all'} onValueChange={v => onFiltersChange({ ...filters, city: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas as cidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center text-xs">
          {filteredInterviews.length} entrevistas · {gpsRate}% com GPS
        </Badge>
      </div>

      {filteredInterviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma entrevista registrada{selectedRoundId ? ' nesta rodada' : ''}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vote Intention */}
          {voteIntentionData.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Intenção de Voto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={voteIntentionData} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={95} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(val: number, _: string, entry: any) => [`${val} (${entry.payload.pct}%)`, 'Votos']}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {voteIntentionData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evolution */}
          {evolutionData.length > 1 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evolução por Rodada (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="round" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Legend />
                      {candidateNames.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* City comparison */}
          {cityComparisonData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Entrevistas por Cidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cityComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="city" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gender pie */}
          {genderData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Gênero dos Entrevistados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {genderData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Age distribution */}
          {ageData.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Faixa Etária</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
