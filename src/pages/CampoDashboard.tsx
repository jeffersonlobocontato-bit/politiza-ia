import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, MapPin, TrendingUp } from 'lucide-react';
import { useLeaders } from '@/hooks/useLeaders';
import { useLeadershipProfiles } from '@/hooks/useLeadershipProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InfographicDonut, InfographicHBar, CHART_PRIMARY, CHART_MINT } from '@/components/ui/InfographicCharts';

const ALIGN_COLORS: Record<string, string> = {
  alinhado: '#22c55e', provavel: '#3b82f6', neutro: '#6b7280', oposicao: '#ef4444', indefinido: '#f59e0b',
};
const ALIGN_LABELS: Record<string, string> = {
  alinhado: 'Alinhado', provavel: 'Provável', neutro: 'Neutro', oposicao: 'Oposição', indefinido: 'Indefinido',
};

export default function CampoDashboard() {
  const { user, isAdmin } = useAuth();
  const { data: all = [] } = useLeaders();
  const { data: profiles = [] } = useLeadershipProfiles(true);

  // Escopo: admin vê tudo, demais vê só os próprios cadastros
  const leaders = useMemo(() => {
    if (isAdmin) return all;
    return all.filter(l => l.created_by === user?.id);
  }, [all, isAdmin, user?.id]);

  const leaderIds = useMemo(() => leaders.map(l => l.id), [leaders]);
  const { data: links = [] } = useQuery<{ leader_id: string; profile_id: string }[]>({
    queryKey: ['campo-dashboard-links', leaderIds],
    enabled: leaderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('leader_leadership_profiles').select('leader_id, profile_id').in('leader_id', leaderIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);
  const thisWeek = leaders.filter(l => new Date(l.created_at) >= weekStart).length;
  const thisMonth = leaders.filter(l => new Date(l.created_at) >= monthStart).length;

  // Qualidade do cadastro: % campos preenchidos chave
  const qualityScore = leaders.length === 0 ? 0 : Math.round(
    leaders.reduce((acc, l) => {
      const fields = [l.phone, l.email, l.neighborhood, l.current_party, l.observations, l.photo_url];
      const filled = fields.filter(Boolean).length;
      return acc + (filled / fields.length) * 100;
    }, 0) / leaders.length
  );

  const segmentData = profiles
    .map(p => ({ name: p.name, value: links.filter(lk => lk.profile_id === p.id).length, color: p.color }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const cityCounts: Record<string, number> = {};
  leaders.forEach(l => { if (l.municipality) cityCounts[l.municipality] = (cityCounts[l.municipality] ?? 0) + 1; });
  const cityData = Object.entries(cityCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  const alignData = Object.entries(ALIGN_LABELS).map(([k, label]) => ({
    name: label,
    value: leaders.filter(l => (l.alignment_status ?? 'indefinido') === k).length,
    color: ALIGN_COLORS[k],
  })).filter(d => d.value > 0);

  const recent = [...leaders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Link to="/campo" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <BarChart3 className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">Dashboard de Campo</h1>
          <p className="text-xs text-muted-foreground">{isAdmin ? 'Visão consolidada' : 'Seus cadastros'} — {leaders.length} liderança(s)</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto">
          {[
            { label: 'Total no escopo', value: leaders.length, icon: Users, color: 'text-primary' },
            { label: 'Últimos 7 dias', value: thisWeek, icon: TrendingUp, color: 'text-secondary' },
            { label: 'Últimos 30 dias', value: thisMonth, icon: TrendingUp, color: 'text-secondary' },
            { label: 'Qualidade média', value: `${qualityScore}%`, icon: BarChart3, color: 'text-primary' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border p-4 bg-card">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><k.icon className={`w-4 h-4 ${k.color}`} /> {k.label}</div>
              <div className="text-2xl font-bold text-foreground mt-1">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {leaders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            <InfographicDonut title="Alinhamento" unit="lideranças" data={alignData} height={210} />
            <InfographicHBar title="Por Segmento" subtitle="top 10" data={segmentData} accentColor={CHART_PRIMARY} />
            <InfographicHBar title="Por Cidade" subtitle="top 10" data={cityData} accentColor={CHART_MINT} />
          </div>
        ) : (
          <div className="text-center py-12 max-w-md mx-auto">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Você ainda não cadastrou nenhuma liderança.</p>
            <Link to="/campo/liderancas/novo" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
              Cadastrar primeira liderança
            </Link>
          </div>
        )}

        {/* Recentes */}
        {recent.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h3 className="text-sm font-semibold text-foreground mb-2">Últimos cadastros</h3>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {recent.map(l => (
                <Link key={l.id} to={`/campo/liderancas/${l.id}`} className="flex items-center gap-3 p-3 hover:bg-accent transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {l.photo_url ? <img src={l.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px]">{l.name.slice(0,2).toUpperCase()}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate">{l.name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {l.municipality}{l.neighborhood ? ` · ${l.neighborhood}` : ''}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString('pt-BR')}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
