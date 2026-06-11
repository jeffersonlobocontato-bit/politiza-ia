import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ArrowLeft, Users, MapPin, Vote, CheckCircle2, AlertCircle, TrendingUp, Sparkles, Activity, ShieldAlert,
} from 'lucide-react';
import { SCENARIO_LABEL, type Scenario, slateVote } from '@/hooks/useChapaCrossAnalytics';
import type { SlateCandidate } from '@/hooks/usePartySlate';

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

const PARTY_ACCENT: Record<string, string> = {
  PL: '#1F5AB4',
  Novo: '#F97316',
};

interface Props {
  slate: SlateCandidate & { candidate_id: string | null };
  onBack: () => void;
}

export default function PreCandidateDetailView({ slate, onBack }: Props) {
  // Vincular candidato (FK ou por nome)
  const candidateId = slate.candidate_id;

  // Carregar projeções do candidato vinculado
  const { data: projections = [], isLoading } = useQuery({
    queryKey: ['pre-cand-projections', candidateId ?? slate.id],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vote_projections')
        .select('id, leader_id, municipality, macroregion_id, optimistic, intermediate, pessimistic, reliability_index, status')
        .eq('candidate_id', candidateId)
        .eq('status', 'ativa')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; leader_id: string; municipality: string | null; macroregion_id: string | null;
        optimistic: number; intermediate: number; pessimistic: number;
        reliability_index: 'alta' | 'media' | 'baixa' | null;
      }>;
    },
  });

  const { data: leadersAll = [] } = useQuery({
    queryKey: ['leaders-all-mini'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('leaders')
        .select('id, name, municipality, macroregion_id, influence_level')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; municipality: string | null; macroregion_id: string | null; influence_level: number }>;
    },
  });

  const { data: leaderProfileLinks = [] } = useQuery({
    queryKey: ['leader-profile-links-mini'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('leader_leadership_profiles').select('leader_id, profile_id');
      if (error) throw error;
      return (data ?? []) as Array<{ leader_id: string; profile_id: string }>;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['leadership-profiles-mini'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('leadership_profiles').select('id, name, color');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; color: string }>;
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['pre-cand-actions', candidateId ?? slate.id],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('actions')
        .select('id, status, municipality, executed_people_count')
        .eq('candidate_id', candidateId)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; status: string; municipality: string | null; executed_people_count: number | null }>;
    },
  });

  const leaderMap = useMemo(() => {
    const m: Record<string, typeof leadersAll[number]> = {};
    leadersAll.forEach((l) => { m[l.id] = l; });
    return m;
  }, [leadersAll]);

  const profileMap = useMemo(() => {
    const m: Record<string, typeof profiles[number]> = {};
    profiles.forEach((p) => { m[p.id] = p; });
    return m;
  }, [profiles]);

  // Cálculos
  const computed = useMemo(() => {
    let o = 0, i = 0, p = 0;
    const municipalities = new Set<string>();
    const leaderIds = new Set<string>();
    const reliability = { alta: 0, media: 0, baixa: 0 };
    projections.forEach((pr) => {
      o += pr.optimistic; i += pr.intermediate; p += pr.pessimistic;
      if (pr.municipality) municipalities.add(pr.municipality);
      leaderIds.add(pr.leader_id);
      const r = (pr.reliability_index ?? 'media') as keyof typeof reliability;
      if (reliability[r] !== undefined) reliability[r]++;
    });
    return { bom: o, medio: i, ruim: p, municipalities, leaderIds, reliability };
  }, [projections]);

  // Top lideranças
  const topLeaders = useMemo(() => {
    const acc: Record<string, { name: string; intermediate: number; optimistic: number; pessimistic: number }> = {};
    projections.forEach((pr) => {
      const l = leaderMap[pr.leader_id];
      if (!l) return;
      if (!acc[pr.leader_id]) acc[pr.leader_id] = { name: l.name, intermediate: 0, optimistic: 0, pessimistic: 0 };
      acc[pr.leader_id].intermediate += pr.intermediate;
      acc[pr.leader_id].optimistic += pr.optimistic;
      acc[pr.leader_id].pessimistic += pr.pessimistic;
    });
    return Object.values(acc).sort((a, b) => b.intermediate - a.intermediate).slice(0, 10);
  }, [projections, leaderMap]);

  // Top cidades
  const topCities = useMemo(() => {
    const acc: Record<string, { name: string; intermediate: number; optimistic: number; pessimistic: number }> = {};
    projections.forEach((pr) => {
      if (!pr.municipality) return;
      if (!acc[pr.municipality]) acc[pr.municipality] = { name: pr.municipality, intermediate: 0, optimistic: 0, pessimistic: 0 };
      acc[pr.municipality].intermediate += pr.intermediate;
      acc[pr.municipality].optimistic += pr.optimistic;
      acc[pr.municipality].pessimistic += pr.pessimistic;
    });
    return Object.values(acc).sort((a, b) => b.intermediate - a.intermediate).slice(0, 10);
  }, [projections]);

  // Perfis de liderança engajados
  const profilesData = useMemo(() => {
    const profilesByLeader: Record<string, string[]> = {};
    leaderProfileLinks.forEach((l) => {
      if (!profilesByLeader[l.leader_id]) profilesByLeader[l.leader_id] = [];
      profilesByLeader[l.leader_id].push(l.profile_id);
    });
    const counts: Record<string, number> = {};
    computed.leaderIds.forEach((lid) => {
      (profilesByLeader[lid] ?? []).forEach((pid) => { counts[pid] = (counts[pid] ?? 0) + 1; });
    });
    return Object.entries(counts).map(([pid, value]) => {
      const p = profileMap[pid];
      return { name: p?.name ?? pid, value, color: p?.color ?? '#888' };
    }).sort((a, b) => b.value - a.value);
  }, [leaderProfileLinks, computed.leaderIds, profileMap]);

  // Confiabilidade
  const reliabilityData = useMemo(() => {
    const total = computed.reliability.alta + computed.reliability.media + computed.reliability.baixa;
    if (total === 0) return null;
    const score = (computed.reliability.alta * 1 + computed.reliability.media * 0.5) / total;
    return {
      score, total,
      label: score >= 0.7 ? 'alta' : score >= 0.4 ? 'média' : 'baixa',
      color: score >= 0.7 ? '#22c55e' : score >= 0.4 ? '#f59e0b' : '#ef4444',
    };
  }, [computed.reliability]);

  // Ações summary
  const actionsSummary = useMemo(() => {
    const done = actions.filter((a) => a.status === 'realizada').length;
    const people = actions.reduce((s, a) => s + (a.executed_people_count ?? 0), 0);
    return { total: actions.length, done, people };
  }, [actions]);

  const partyAccent = PARTY_ACCENT[slate.party] ?? 'hsl(var(--primary))';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-card" style={{ borderColor: partyAccent }}>
              {slate.photo_url
                ? <img src={slate.photo_url} alt={slate.name} className="w-full h-full object-cover" />
                : <span className="text-sm font-bold" style={{ color: partyAccent }}>{slate.name.charAt(0)}</span>}
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {slate.name}
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: partyAccent, color: partyAccent }}>
                  {slate.party}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {slate.cargo} · {slate.city || '—'} {slate.association ? `· ${slate.association}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={slate.filiacao_status === 'ok' ? 'default' : 'secondary'} className="text-[10px]">
            Filiação: {slate.filiacao_status}
          </Badge>
          {!candidateId && (
            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-400">
              <ShieldAlert className="w-3 h-3 mr-1" /> Sem vínculo com candidato
            </Badge>
          )}
        </div>
      </div>

      {!candidateId && (
        <Card className="bg-amber-500/10 border-amber-500/30 p-4">
          <p className="text-sm text-amber-300">
            Este pré-candidato ainda não está vinculado a um registro oficial em <strong>Candidatos</strong>.
            Sem vínculo, não conseguimos calcular projeções sustentadas pela base, ações e perfis.
            Vincule na tela de gestão da chapa.
          </p>
        </Card>
      )}

      {/* Cenários: declarado vs sustentado */}
      <div className="grid sm:grid-cols-3 gap-3">
        {(['bom', 'medio', 'ruim'] as Scenario[]).map((s) => (
          <Card key={s} className="p-4 bg-card/80 border-border/60 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: partyAccent }} />
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cenário {SCENARIO_LABEL[s]}</div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground">Declarado</div>
                <div className="text-xl font-black">{fmt(slateVote(slate, s))}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Sustentado base</div>
                <div className="text-xl font-black">{fmt(computed[s])}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* KPIs operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Mini label="Lideranças" value={computed.leaderIds.size} icon={Users} />
        <Mini label="Municípios" value={computed.municipalities.size} icon={MapPin} />
        <Mini label="Projeções" value={projections.length} icon={Vote} />
        <Mini label="Confiabilidade" value={reliabilityData?.label ?? '—'} icon={Sparkles} valueColor={reliabilityData?.color} />
        <Mini label="Ações" value={actionsSummary.total} icon={Activity} />
        <Mini label="Realizadas" value={actionsSummary.done} icon={CheckCircle2} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card/80 border-border/60">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Top 10 lideranças
          </h3>
          {topLeaders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem projeções cadastradas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topLeaders} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={95} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="intermediate" name="Médio" fill={partyAccent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4 bg-card/80 border-border/60">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Top 10 cidades
          </h3>
          {topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem cidades projetadas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCities} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={95} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="optimistic" name="Bom" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="intermediate" name="Médio" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                <Bar dataKey="pessimistic" name="Ruim" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4 bg-card/80 border-border/60">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Perfis das lideranças engajadas
          </h3>
          {profilesData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Lideranças sem perfis cadastrados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={profilesData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {profilesData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4 bg-card/80 border-border/60">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Ações executadas no território
          </h3>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Stat label="Total ações" value={actionsSummary.total} />
            <Stat label="Realizadas" value={actionsSummary.done} />
            <Stat label="Pessoas impactadas" value={fmt(actionsSummary.people)} />
          </div>
          {actions.length === 0 && (
            <p className="text-xs text-muted-foreground mt-4">Nenhuma ação registrada vinculada a este candidato.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value, icon: Icon, valueColor }: { label: string; value: string | number; icon: any; valueColor?: string }) {
  return (
    <Card className="p-3 bg-card/80 border-border/60">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="text-lg font-black mt-1" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-background/40 px-3 py-2 border border-border/40">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
