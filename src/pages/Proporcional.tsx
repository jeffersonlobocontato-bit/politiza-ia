import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard, ChartCard, tooltipStyle, CHART_COLORS, GRID_STROKE, AXIS_TICK_LIGHT, LEGEND_STYLE } from '@/components/ui/DashboardCards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLeaders, Leader } from '@/hooks/useLeaders';
import { useVoteProjections, useProjectionStats, VoteProjection } from '@/hooks/useVoteProjections';
import { useLeadershipProfiles } from '@/hooks/useLeadershipProfiles';
import { LeaderFormDialog } from '@/components/proporcional/LeaderFormDialog';
import { ProjectionFormDialog } from '@/components/proporcional/ProjectionFormDialog';
import { useCandidate } from '@/contexts/CandidateContext';
import { supabase } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Search, Users, TrendingUp, MapPin, Target, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  Vote, Filter, ChevronRight, Zap, ShieldAlert, Award
} from 'lucide-react';

const MACROREGION_NAMES: Record<string, string> = {
  curitiba: 'Curitiba', rmc: 'RMC', litoral: 'Litoral', campos_gerais: 'Campos Gerais',
  norte: 'Norte', noroeste: 'Noroeste', oeste: 'Oeste',
  sudoeste: 'Sudoeste', centro_sul: 'Centro-Sul', sudeste: 'Sudeste',
};

const CANDIDACY_LABELS: Record<string, string> = {
  vereador: 'Vereador', deputado_estadual: 'Dep. Estadual',
  deputado_federal: 'Dep. Federal', senador: 'Senador',
};

const SCENARIO_COLORS = {
  optimistic: CHART_COLORS[0],   // mint
  intermediate: CHART_COLORS[3], // gold
  pessimistic: CHART_COLORS[4],  // red
};

export default function Proporcional() {
  const [tab, setTab] = useState('dashboard');
  const [leaderSearch, setLeaderSearch] = useState('');
  const [projSearch, setProjSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState('all');
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [projDialogOpen, setProjDialogOpen] = useState(false);
  const [editLeader, setEditLeader] = useState<Leader | undefined>();
  const [editProjection, setEditProjection] = useState<VoteProjection | undefined>();

  const { activeCandidate } = useCandidate();
  const { data: allLeaders = [], isLoading: loadingLeaders } = useLeaders();
  const { data: projections = [], isLoading: loadingProj } = useVoteProjections(
    activeCandidate ? { candidate_id: activeCandidate.id } : undefined
  );
  const { data: profiles = [] } = useLeadershipProfiles();
  const stats = useProjectionStats(activeCandidate?.id);

  // Filter leaders linked to active candidate
  const leaders = useMemo(() => {
    if (!activeCandidate) return allLeaders;
    return allLeaders.filter(l => l.candidate_id === activeCandidate.id);
  }, [allLeaders, activeCandidate]);

  // Leader profiles junction
  const { data: leaderProfileLinks = [] } = useQuery({
    queryKey: ['leader-profile-links-all'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('leader_leadership_profiles').select('*');
      return data ?? [];
    },
  });

  const leaderProfileMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    leaderProfileLinks.forEach((l: any) => {
      if (!map[l.leader_id]) map[l.leader_id] = [];
      map[l.leader_id].push(l.profile_id);
    });
    return map;
  }, [leaderProfileLinks]);

  const candidateMap = useMemo(() => {
    const m: Record<string, any> = {};
    if (activeCandidate) m[activeCandidate.id] = activeCandidate;
    return m;
  }, [activeCandidate]);

  const leaderMap = useMemo(() => {
    const m: Record<string, Leader> = {};
    leaders.forEach(l => { m[l.id] = l; });
    return m;
  }, [leaders]);

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach(p => { m[p.id] = p; });
    return m;
  }, [profiles]);

  // Filter leaders
  const filteredLeaders = useMemo(() => {
    return leaders.filter(l => {
      if (leaderSearch && !l.name.toLowerCase().includes(leaderSearch.toLowerCase())) return false;
      if (macroFilter !== 'all' && l.macroregion_id !== macroFilter) return false;
      return true;
    });
  }, [leaders, leaderSearch, macroFilter]);

  // Filter projections
  const filteredProjections = useMemo(() => {
    return projections.filter(p => {
      if (projSearch) {
        const leader = leaderMap[p.leader_id];
        const candidate = candidateMap[p.candidate_id];
        const searchLower = projSearch.toLowerCase();
        if (!leader?.name.toLowerCase().includes(searchLower) && 
            !candidate?.name.toLowerCase().includes(searchLower) &&
            !p.municipality?.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [projections, projSearch, leaderMap, candidateMap]);

  // Chart data
  const macroChartData = useMemo(() => {
    return Object.entries(stats.byMacroregion).map(([key, val]) => ({
      name: MACROREGION_NAMES[key] || key,
      Otimista: val.optimistic,
      Intermediário: val.intermediate,
      Pessimista: val.pessimistic,
    })).sort((a, b) => b.Intermediário - a.Intermediário);
  }, [stats]);

  const topLeadersData = useMemo(() => {
    const leaderTotals: Record<string, { name: string; optimistic: number; intermediate: number; pessimistic: number }> = {};
    projections.filter(p => p.status === 'ativa').forEach(p => {
      const l = leaderMap[p.leader_id];
      if (!l) return;
      if (!leaderTotals[p.leader_id]) leaderTotals[p.leader_id] = { name: l.name, optimistic: 0, intermediate: 0, pessimistic: 0 };
      leaderTotals[p.leader_id].optimistic += p.optimistic;
      leaderTotals[p.leader_id].intermediate += p.intermediate;
      leaderTotals[p.leader_id].pessimistic += p.pessimistic;
    });
    return Object.values(leaderTotals).sort((a, b) => b.intermediate - a.intermediate).slice(0, 10);
  }, [projections, leaderMap]);

  const topCitiesData = useMemo(() => {
    return Object.entries(stats.byMunicipality)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.intermediate - a.intermediate)
      .slice(0, 10);
  }, [stats]);

  const reliabilityPieData = useMemo(() => {
    const counts = { alta: 0, media: 0, baixa: 0 };
    projections.filter(p => p.status === 'ativa').forEach(p => {
      const key = (p.reliability_index || 'media') as keyof typeof counts;
      counts[key]++;
    });
    return [
      { name: 'Alta', value: counts.alta, color: CHART_COLORS[0] },
      { name: 'Média', value: counts.media, color: CHART_COLORS[3] },
      { name: 'Baixa', value: counts.baixa, color: CHART_COLORS[4] },
    ].filter(d => d.value > 0);
  }, [projections]);

  const openEditLeader = (l: Leader) => { setEditLeader(l); setLeaderDialogOpen(true); };
  const openNewLeader = () => { setEditLeader(undefined); setLeaderDialogOpen(true); };
  const openEditProjection = (p: VoteProjection) => { setEditProjection(p); setProjDialogOpen(true); };
  const openNewProjection = () => { setEditProjection(undefined); setProjDialogOpen(true); };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            Campanha Proporcional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Projeção de votos, lideranças e análise territorial</p>
        </div>
        {activeCandidate && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {activeCandidate.photo_url
                ? <img src={activeCandidate.photo_url} alt={activeCandidate.name} className="w-full h-full object-cover" />
                : <span className="text-sm font-bold text-primary">{activeCandidate.name.charAt(0)}</span>}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{activeCandidate.name}</p>
              <p className="text-xs text-muted-foreground">{activeCandidate.cargo} · {activeCandidate.party}</p>
            </div>
          </div>
        )}
      </div>

      {!activeCandidate && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-amber-300">Nenhum candidato ativo. Acesse <strong>Configurações</strong> para ativar um candidato.</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="liderancas" className="gap-1.5"><Users className="w-3.5 h-3.5" />Lideranças</TabsTrigger>
          <TabsTrigger value="projecoes" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Projeções</TabsTrigger>
        </TabsList>

        {/* ======================== DASHBOARD ======================== */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Big Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard title="Otimista" value={stats.totalOptimistic.toLocaleString()} icon={ArrowUpRight} gradientIndex={1} />
            <KpiCard title="Intermediário" value={stats.totalIntermediate.toLocaleString()} icon={Minus} gradientIndex={3} />
            <KpiCard title="Pessimista" value={stats.totalPessimistic.toLocaleString()} icon={ArrowDownRight} gradientIndex={5} />
            <KpiCard title="Lideranças" value={stats.leaderCount.toString()} icon={Users} gradientIndex={0} />
            <KpiCard title="Territórios" value={stats.territoriesCount.toString()} icon={MapPin} gradientIndex={2} />
            <KpiCard title="Média/Líder" value={stats.avgPerLeader.toLocaleString()} icon={Target} gradientIndex={4} />
            <KpiCard title="Total Líderes" value={leaders.length.toString()} icon={Award} gradientIndex={0} />
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* By Macroregion */}
            <ChartCard title="Projeção por Macrorregião">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={macroChartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis type="number" tick={AXIS_TICK_LIGHT} />
                  <YAxis dataKey="name" type="category" tick={AXIS_TICK_LIGHT} width={75} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="Otimista" fill={SCENARIO_COLORS.optimistic} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Intermediário" fill={SCENARIO_COLORS.intermediate} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Pessimista" fill={SCENARIO_COLORS.pessimistic} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top Leaders */}
            <ChartCard title="Ranking de Lideranças">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topLeadersData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis type="number" tick={AXIS_TICK_LIGHT} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#8899aa' }} width={95} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="intermediate" name="Intermediário" fill={SCENARIO_COLORS.intermediate} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top Cities */}
            <ChartCard title="Top Cidades por Projeção">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCitiesData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis type="number" tick={AXIS_TICK_LIGHT} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#8899aa' }} width={95} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="optimistic" name="Otimista" fill={SCENARIO_COLORS.optimistic} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="intermediate" name="Intermediário" fill={SCENARIO_COLORS.intermediate} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pessimistic" name="Pessimista" fill={SCENARIO_COLORS.pessimistic} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Reliability Pie */}
            <ChartCard title="Confiabilidade das Projeções">
              <div className="flex items-center justify-center">
                {reliabilityPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={reliabilityPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {reliabilityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-12">Nenhuma projeção cadastrada</p>
                )}
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ======================== LIDERANÇAS ======================== */}
        <TabsContent value="liderancas" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar liderança..." value={leaderSearch} onChange={e => setLeaderSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={macroFilter} onValueChange={setMacroFilter}>
                <SelectTrigger className="w-44"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas regiões</SelectItem>
                  {Object.entries(MACROREGION_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openNewLeader}><Plus className="w-4 h-4 mr-1" /> Nova Liderança</Button>
          </div>

          <Card className="bg-card/80 border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Nome</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>Macrorregião</TableHead>
                    <TableHead>Perfis</TableHead>
                    <TableHead>Influência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Partido</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLeaders ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filteredLeaders.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma liderança encontrada</TableCell></TableRow>
                  ) : filteredLeaders.map(l => (
                    <TableRow key={l.id} className="border-border/30 cursor-pointer hover:bg-muted/30" onClick={() => openEditLeader(l)}>
                      <TableCell className="font-medium text-foreground">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{l.municipality || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{MACROREGION_NAMES[l.macroregion_id || ''] || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(leaderProfileMap[l.id] || []).slice(0, 3).map(pid => {
                            const p = profileMap[pid];
                            return p ? (
                              <Badge key={pid} variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: p.color, color: p.color }}>{p.name}</Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${l.influence_level * 10}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{l.influence_level}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'ativo' ? 'default' : 'secondary'} className="text-[10px]">{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.current_party || '—'}</TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== PROJEÇÕES ======================== */}
        <TabsContent value="projecoes" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por liderança, candidato ou cidade..." value={projSearch} onChange={e => setProjSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={openNewProjection}><Plus className="w-4 h-4 mr-1" /> Nova Projeção</Button>
          </div>

          <Card className="bg-card/80 border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Liderança</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead className="text-center text-green-400">Otimista</TableHead>
                    <TableHead className="text-center text-amber-400">Interm.</TableHead>
                    <TableHead className="text-center text-red-400">Pessim.</TableHead>
                    <TableHead>Conf.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingProj ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filteredProjections.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma projeção encontrada</TableCell></TableRow>
                  ) : filteredProjections.map(p => (
                    <TableRow key={p.id} className="border-border/30 cursor-pointer hover:bg-muted/30" onClick={() => openEditProjection(p)}>
                      <TableCell className="font-medium text-foreground text-sm">{leaderMap[p.leader_id]?.name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{candidateMap[p.candidate_id]?.name || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{CANDIDACY_LABELS[p.candidacy_type] || p.candidacy_type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.municipality || '—'}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-green-400">{p.optimistic.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-amber-400">{p.intermediate.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-red-400">{p.pessimistic.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          p.reliability_index === 'alta' ? 'border-green-500 text-green-400' :
                          p.reliability_index === 'baixa' ? 'border-red-500 text-red-400' :
                          'border-amber-500 text-amber-400'
                        }`}>
                          {p.reliability_index || 'média'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'ativa' ? 'default' : 'secondary'} className="text-[10px]">{p.status}</Badge>
                      </TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeaderFormDialog
        open={leaderDialogOpen}
        onOpenChange={setLeaderDialogOpen}
        leader={editLeader}
        initialProfileIds={editLeader ? (leaderProfileMap[editLeader.id] || []) : []}
      />
      <ProjectionFormDialog
        open={projDialogOpen}
        onOpenChange={setProjDialogOpen}
        projection={editProjection}
      />
    </div>
  );
}
