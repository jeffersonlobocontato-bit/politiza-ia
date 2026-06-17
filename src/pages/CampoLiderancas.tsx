import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, MapPin, Phone, Pencil, BarChart3, ArrowLeft, UserCircle2 } from 'lucide-react';
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

  const creatorIds = useMemo(() => Array.from(new Set(allLeaders.map(l => l.created_by).filter(Boolean))) as string[], [allLeaders]);
  const { data: creatorProfiles = [] } = useQuery<{ id: string; full_name: string | null; email: string | null }[]>({
    queryKey: ['leader-creators', creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', creatorIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const creatorMap = useMemo(() => {
    const m = new Map<string, string>();
    creatorProfiles.forEach(p => m.set(p.id, p.full_name || p.email || 'Usuário'));
    return m;
  }, [creatorProfiles]);

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
    <div className="campo-screen">
      <div className="campo-page-header">
        <Link to="/campo" className="campo-icon-btn"><ArrowLeft className="w-4 h-4" /></Link>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center hidden sm:flex"
          style={{ background: 'rgba(47,168,90,0.15)', border: '1px solid rgba(47,168,90,0.35)' }}
        >
          <Users className="w-4 h-4" style={{ color: 'var(--campo-mint-glow)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1>Lideranças</h1>
          <p>{filtered.length} de {allLeaders.length}</p>
        </div>
        <Link to="/campo/dashboard" aria-label="Painel" className="campo-icon-btn">
          <BarChart3 className="w-4 h-4" />
        </Link>
        <Link to="/campo/liderancas/novo" className="campo-cta px-3 sm:px-4" style={{ height: '2.25rem' }}>
          <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Nova</span>
        </Link>
      </div>

      {/* Filtros */}
      <div
        className="px-4 py-3 grid grid-cols-1 sm:flex sm:flex-wrap gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--campo-line)' }}
      >
        <div className="relative sm:flex-1 sm:min-w-[200px] min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--campo-text-faint)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nome, cidade, bairro..."
            className="campo-input pl-9"
            style={{ height: '2.25rem' }}
          />
        </div>
        {isAdmin && (
          <select value={scope} onChange={e => setScope(e.target.value as any)} className="campo-select" style={{ height: '2.25rem' }}>
            <option value="all">Todas</option>
            <option value="mine">Minhas</option>
          </select>
        )}
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="campo-select" style={{ height: '2.25rem' }}>
          <option value="all">Todas as cidades</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={alignFilter} onChange={e => setAlignFilter(e.target.value)} className="campo-select" style={{ height: '2.25rem' }}>
          <option value="all">Todos alinhamentos</option>
          {Object.entries(ALIGN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className="campo-select" style={{ height: '2.25rem' }}>
          <option value="all">Todos segmentos</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 pb-24">
        {isLoading ? (
          <div className="text-center text-sm py-12" style={{ color: 'var(--campo-text-mute)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--campo-text-faint)' }} />
            <p className="text-sm mb-4" style={{ color: 'var(--campo-text-mute)' }}>Nenhuma liderança encontrada.</p>
            <Link to="/campo/liderancas/novo" className="campo-cta inline-flex">
              <Plus className="w-4 h-4" /> Cadastrar primeira
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(l => {
              const myProfiles = profiles.filter(p => leaderProfileLinks.some(lk => lk.leader_id === l.id && lk.profile_id === p.id));
              const align = l.alignment_status ?? 'indefinido';
              return (
                <Link key={l.id} to={`/campo/liderancas/${l.id}`} className="campo-card group relative p-4 block">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                      style={{ background: 'var(--campo-surface-2)' }}
                    >
                      {l.photo_url
                        ? <img src={l.photo_url} alt={l.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs text-white">{l.name.slice(0,2).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">{l.name}</div>
                      <div className="text-[11px] flex items-center gap-1 truncate" style={{ color: 'var(--campo-text-mute)' }}>
                        <MapPin className="w-3 h-3" />{l.municipality ?? '—'}{l.neighborhood ? ` · ${l.neighborhood}` : ''}
                      </div>
                      {l.phone && (
                        <div className="text-[11px] flex items-center gap-1 truncate" style={{ color: 'var(--campo-text-mute)' }}>
                          <Phone className="w-3 h-3" />{l.phone}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ color: ALIGN_COLORS[align], backgroundColor: `${ALIGN_COLORS[align]}25` }}
                    >
                      {ALIGN_LABELS[align]}
                    </span>
                  </div>
                  {myProfiles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {myProfiles.slice(0,4).map(p => (
                        <span
                          key={p.id}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                          style={{ color: p.color, borderColor: `${p.color}50`, backgroundColor: `${p.color}20` }}
                        >
                          {p.name}
                        </span>
                      ))}
                      {myProfiles.length > 4 && (
                        <span className="text-[10px]" style={{ color: 'var(--campo-text-mute)' }}>+{myProfiles.length-4}</span>
                      )}
                    </div>
                  )}
                  {l.created_by && (
                    <div className="mt-3 pt-2 flex items-center gap-1.5 text-[10px]" style={{ borderTop: '1px solid var(--campo-line)', color: 'var(--campo-text-mute)' }}>
                      <UserCircle2 className="w-3 h-3" />
                      <span className="truncate">Cadastrado por: <span style={{ color: 'var(--campo-text)' }}>{creatorMap.get(l.created_by) ?? '—'}</span></span>
                    </div>
                  )}
                  <Pencil
                    className="absolute top-3 right-3 w-3 h-3 opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--campo-text-mute)' }}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
