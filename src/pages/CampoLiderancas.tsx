import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, MapPin, Phone, Pencil, BarChart3, ArrowLeft } from 'lucide-react';
import { useLeaders } from '@/hooks/useLeaders';
import { useLeadershipProfiles } from '@/hooks/useLeadershipProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ALIGN_COLORS: Record<string, string> = {
  alinhado: '#22c55e', provavel: '#3b82f6', neutro: '#6b7280', oposicao: '#ef4444', indefinido: '#f59e0b',
};
const ALIGN_LABELS: Record<string, string> = {
  alinhado: 'Alinhado', provavel: 'Provável', neutro: 'Neutro', oposicao: 'Oposição', indefinido: 'Indef.',
};

export default function CampoLiderancas() {
  const { user, isAdmin } = useAuth();
  const { data: allLeaders = [], isLoading } = useLeaders();
  const { data: profiles = [] } = useLeadershipProfiles(true);

  // Pega vínculos perfil↔liderança para badges
  const leaderIds = useMemo(() => allLeaders.map(l => l.id), [allLeaders]);
  const { data: leaderProfileLinks = [] } = useQuery<{ leader_id: string; profile_id: string }[]>({
    queryKey: ['leader-profile-links', leaderIds],
    enabled: leaderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leader_leadership_profiles')
        .select('leader_id, profile_id')
        .in('leader_id', leaderIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [alignFilter, setAlignFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [scope, setScope] = useState<'mine' | 'all'>(isAdmin ? 'all' : 'mine');

  const cities = useMemo(() => {
    const s = new Set<string>();
    allLeaders.forEach(l => { if (l.municipality) s.add(l.municipality); });
    return Array.from(s).sort();
  }, [allLeaders]);

  const filtered = useMemo(() => {
    return allLeaders.filter(l => {
      if (scope === 'mine' && user && l.created_by !== user.id) return false;
      const q = search.toLowerCase();
      if (search && !l.name.toLowerCase().includes(q) && !(l.municipality ?? '').toLowerCase().includes(q) && !(l.neighborhood ?? '').toLowerCase().includes(q)) return false;
      if (cityFilter !== 'all' && l.municipality !== cityFilter) return false;
      if (alignFilter !== 'all' && l.alignment_status !== alignFilter) return false;
      if (profileFilter !== 'all') {
        const has = leaderProfileLinks.some(lk => lk.leader_id === l.id && lk.profile_id === profileFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [allLeaders, scope, user, search, cityFilter, alignFilter, profileFilter, leaderProfileLinks]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Link to="/campo" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <Users className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">Lideranças de Campo</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} de {allLeaders.length} lideranças</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/campo/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-accent text-foreground transition-colors">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </Link>
          <Link to="/campo/liderancas/novo" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90" style={{ background: 'var(--gradient-primary)' }}>
            <Plus className="w-4 h-4" /> Nova Liderança
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 border-b border-border flex gap-2 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, cidade, bairro..." className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm" />
        </div>
        {isAdmin && (
          <select value={scope} onChange={e => setScope(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">Todas as lideranças</option>
            <option value="mine">Somente as minhas</option>
          </select>
        )}
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todas as cidades</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={alignFilter} onChange={e => setAlignFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos alinhamentos</option>
          {Object.entries(ALIGN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos segmentos</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhuma liderança encontrada com os filtros atuais.</p>
            <Link to="/campo/liderancas/novo" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground" style={{ background: 'var(--gradient-primary)' }}>
              <Plus className="w-4 h-4" /> Cadastrar primeira liderança
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-7xl mx-auto">
            {filtered.map(l => {
              const myProfiles = profiles.filter(p => leaderProfileLinks.some(lk => lk.leader_id === l.id && lk.profile_id === p.id));
              const align = l.alignment_status ?? 'indefinido';
              return (
                <Link key={l.id} to={`/campo/liderancas/${l.id}`} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {l.photo_url ? <img src={l.photo_url} alt={l.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{l.name.slice(0,2).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{l.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{l.municipality ?? '—'}{l.neighborhood ? ` · ${l.neighborhood}` : ''}</div>
                      {l.phone && <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Phone className="w-3 h-3" />{l.phone}</div>}
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ color: ALIGN_COLORS[align], backgroundColor: `${ALIGN_COLORS[align]}20` }}>{ALIGN_LABELS[align]}</span>
                  </div>
                  {myProfiles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {myProfiles.slice(0,4).map(p => (
                        <span key={p.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border" style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}15` }}>{p.name}</span>
                      ))}
                      {myProfiles.length > 4 && <span className="text-[10px] text-muted-foreground">+{myProfiles.length-4}</span>}
                    </div>
                  )}
                  <Pencil className="absolute top-3 right-3 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
