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
    <div className="campo-screen">
      <div className="campo-page-header">
        <Link to="/campo" className="campo-icon-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(47,168,90,0.15)', border: '1px solid rgba(47,168,90,0.35)' }}
        >
          <BarChart3 className="w-4 h-4" style={{ color: 'var(--campo-mint-glow)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1>Painel de Campo</h1>
          <p>{isAdmin ? 'Visão consolidada' : 'Seus cadastros'} · {leaders.length} liderança(s)</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-4 pb-24">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total', value: leaders.length, icon: Users, color: 'var(--campo-mint-glow)' },
            { label: '7 dias', value: thisWeek, icon: TrendingUp, color: '#5BA0FF' },
            { label: '30 dias', value: thisMonth, icon: TrendingUp, color: '#5BA0FF' },
            { label: 'Qualidade', value: `${qualityScore}%`, icon: BarChart3, color: 'var(--campo-amber)' },
          ].map(k => (
            <div key={k.label} className="campo-card p-4">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--campo-text-mute)' }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} /> {k.label}
              </div>
              <div className="text-2xl font-bold text-white mt-1">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {leaders.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            <div className="campo-card p-3"><InfographicDonut title="Alinhamento" unit="lideranças" data={alignData} height={210} /></div>
            <div className="campo-card p-3"><InfographicHBar title="Por Segmento" subtitle="top 10" data={segmentData} accentColor={CHART_PRIMARY} /></div>
            <div className="campo-card p-3"><InfographicHBar title="Por Cidade" subtitle="top 10" data={cityData} accentColor={CHART_MINT} /></div>
          </div>
        ) : (
          <div className="text-center py-10">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--campo-text-faint)' }} />
            <p className="text-sm mb-4" style={{ color: 'var(--campo-text-mute)' }}>Você ainda não cadastrou nenhuma liderança.</p>
            <Link to="/campo/liderancas/novo" className="campo-cta inline-flex">
              Cadastrar primeira liderança
            </Link>
          </div>
        )}

        {/* Recentes */}
        {recent.length > 0 && (
          <div>
            <h3 className="campo-h2 mb-2">Últimos cadastros</h3>
            <div className="campo-card overflow-hidden">
              {recent.map((l, idx) => (
                <Link
                  key={l.id}
                  to={`/campo/liderancas/${l.id}`}
                  className="flex items-center gap-3 p-3 transition-colors"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--campo-line)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--campo-surface-2)' }}
                  >
                    {l.photo_url
                      ? <img src={l.photo_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[10px] text-white">{l.name.slice(0,2).toUpperCase()}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{l.name}</div>
                    <div className="text-[10px] flex items-center gap-1 truncate" style={{ color: 'var(--campo-text-mute)' }}>
                      <MapPin className="w-3 h-3" /> {l.municipality}{l.neighborhood ? ` · ${l.neighborhood}` : ''}
                    </div>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--campo-text-faint)' }}>
                    {new Date(l.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
