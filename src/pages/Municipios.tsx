import { useState, useEffect, useMemo, useRef } from 'react';
import { Building2, Search, ChevronRight, Loader2, Trophy, Users, MapPin, ArrowUpDown, LayoutGrid, ListOrdered } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MunicipioRaioX } from '@/components/municipios/MunicipioRaioX';
import {
  ASSOCIATIONS_RANKING_2025,
  RANKING_TOTALS_2025,
  getRankingForAcronym,
  formatPopulation,
} from '@/data/associationsRanking';

interface Association {
  id: string;
  acronym: string;
  name: string;
}

interface AssocMember {
  id: string;
  municipality_name: string;
  association_id: string;
}

type ViewMode = 'grid' | 'ranking';
type SortKey = 'rank' | 'population' | 'municipalities' | 'name';

export default function Municipios() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [members, setMembers] = useState<AssocMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    async function load() {
      const [assocRes, membersRes] = await Promise.all([
        supabase.from('municipality_associations').select('id, acronym, name').order('acronym'),
        supabase.from('association_members').select('id, municipality_name, association_id').order('municipality_name'),
      ]);
      setAssociations(assocRes.data || []);
      setMembers(membersRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const groupedByAssoc = useMemo(() => {
    const filtered = search.trim()
      ? members.filter(m => m.municipality_name.toLowerCase().includes(search.toLowerCase()))
      : members;
    const map = new Map<string, AssocMember[]>();
    filtered.forEach(m => {
      const list = map.get(m.association_id) || [];
      list.push(m);
      map.set(m.association_id, list);
    });
    return map;
  }, [members, search]);

  const uniqueCities = useMemo(() => new Set(members.map(m => m.municipality_name)).size, [members]);

  const ASSOC_COLORS = [
    '#2dd4bf', '#60a5fa', '#a78bfa', '#f59e0b', '#ef4444',
    '#34d399', '#f472b6', '#818cf8', '#fb923c', '#06b6d4',
    '#8b5cf6', '#10b981', '#e879f9', '#facc15', '#6366f1',
    '#14b8a6', '#f87171', '#38bdf8', '#c084fc',
  ];
  const assocColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    associations.forEach((a, i) => { map[a.id] = ASSOC_COLORS[i % ASSOC_COLORS.length]; });
    return map;
  }, [associations]);

  // Enriched associations with ranking data (sorted per user choice).
  const enrichedAssocs = useMemo(() => {
    const arr = associations.map(a => {
      const r = getRankingForAcronym(a.acronym);
      const cityCount = members.filter(m => m.association_id === a.id).length;
      return {
        ...a,
        rank: r?.rank ?? 999,
        population: r?.population2025 ?? 0,
        percentPr: r?.percentPr ?? 0,
        polo: r?.polo ?? '',
        municipalities: r?.municipalities ?? cityCount,
        cityCount,
      };
    });
    const sorted = [...arr];
    if (sortKey === 'rank') sorted.sort((a, b) => a.rank - b.rank);
    else if (sortKey === 'population') sorted.sort((a, b) => b.population - a.population);
    else if (sortKey === 'municipalities') sorted.sort((a, b) => b.municipalities - a.municipalities);
    else sorted.sort((a, b) => a.acronym.localeCompare(b.acronym));
    return sorted;
  }, [associations, members, sortKey]);

  const scrollToAssoc = (id: string) => {
    setView('grid');
    setTimeout(() => {
      const el = sectionRefs.current[id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  if (selectedCity) {
    return (
      <MunicipioRaioX
        cityName={selectedCity}
        onBack={() => setSelectedCity(null)}
        associations={associations}
        members={members}
        assocColorMap={assocColorMap}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalPopRanked = ASSOCIATIONS_RANKING_2025.reduce((s, r) => s + r.population2025, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-base font-bold text-foreground">Municípios</h1>
              <p className="text-xs text-muted-foreground">
                Raio X · {uniqueCities} municípios · 19 associações · pop. estimada IBGE 2025
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
                  view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Por associação
              </button>
              <button
                onClick={() => setView('ranking')}
                className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
                  view === 'ranking' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" /> Ranking IBGE 2025
              </button>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar município..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4">
        {view === 'ranking' ? (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Totals strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Trophy className="w-4 h-4" />} label="Associações" value="19" hint="canais associativos" />
              <StatCard icon={<Building2 className="w-4 h-4" />} label="Vínculos" value={String(RANKING_TOTALS_2025.totalLinks)} hint="27 cidades em 2 associações" />
              <StatCard icon={<Users className="w-4 h-4" />} label="População agregada" value={formatPopulation(totalPopRanked)} hint="soma dos vínculos" />
              <StatCard icon={<MapPin className="w-4 h-4" />} label="% do Paraná" value={`${RANKING_TOTALS_2025.percentPrLinks.toFixed(2)}%`} hint="soma bruta dos vínculos" />
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">Clique em uma linha para abrir a associação.</p>
              <div className="flex items-center gap-2 text-[11px]">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="bg-card border border-border rounded px-2 py-1 text-xs"
                >
                  <option value="rank">Ordenar por ranking</option>
                  <option value="population">Ordenar por população</option>
                  <option value="municipalities">Ordenar por nº de municípios</option>
                  <option value="name">Ordenar por sigla</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--gradient-card)' }}>
              <div className="grid grid-cols-[48px_1fr_120px_100px_120px_90px_28px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-card/60">
                <span>#</span>
                <span>Associação</span>
                <span className="text-right">População</span>
                <span className="text-right">% PR</span>
                <span>Cidade-sede</span>
                <span className="text-right">Municípios</span>
                <span />
              </div>
              {enrichedAssocs.map(a => {
                const color = assocColorMap[a.id];
                const barPct = Math.min(100, (a.population / totalPopRanked) * 100 * 3.34); // amplifica para visual
                return (
                  <button
                    key={a.id}
                    onClick={() => scrollToAssoc(a.id)}
                    className="w-full text-left grid grid-cols-[48px_1fr_120px_100px_120px_90px_28px] gap-2 px-3 py-2.5 items-center border-b border-border/50 hover:bg-card transition-colors group"
                  >
                    <span className="text-xs font-bold text-foreground">{a.rank === 999 ? '—' : a.rank}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs font-semibold text-foreground">{a.acronym}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{a.name}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
                      </div>
                    </div>
                    <span className="text-xs text-foreground text-right tabular-nums">{formatPopulation(a.population)}</span>
                    <span className="text-xs text-muted-foreground text-right tabular-nums">{a.percentPr.toFixed(2)}%</span>
                    <span className="text-[11px] text-muted-foreground truncate">{a.polo || '—'}</span>
                    <span className="text-xs text-foreground text-right tabular-nums">{a.municipalities}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground italic px-1">
              Fonte: IBGE (estimativa 1º/jul/2025). {RANKING_TOTALS_2025.note}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {enrichedAssocs.map(assoc => {
              const cityList = groupedByAssoc.get(assoc.id);
              if (!cityList || cityList.length === 0) return null;
              const color = assocColorMap[assoc.id];
              const r = getRankingForAcronym(assoc.acronym);

              return (
                <div key={assoc.id} ref={el => (sectionRefs.current[assoc.id] = el)}>
                  {/* Association header */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                      <Building2 className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-foreground">{assoc.acronym}</h2>
                        {r && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${color}25`, color }}
                            title="Ranking populacional IBGE 2025"
                          >
                            #{r.rank}
                          </span>
                        )}
                        {r && (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> {formatPopulation(r.population2025)} hab · {r.percentPr.toFixed(2)}% do PR
                          </span>
                        )}
                        {r?.polo && (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Sede: {r.polo}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {assoc.name} · {cityList.length} municípios cadastrados
                      </p>
                    </div>
                  </div>

                  {/* Cities grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {cityList.map(m => {
                      const cityAssocs = members.filter(x => x.municipality_name === m.municipality_name);
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedCity(m.municipality_name)}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 transition-all hover:scale-[1.02] text-left group"
                          style={{ background: 'var(--gradient-card)' }}
                        >
                          <span className="text-xs font-medium text-foreground truncate flex-1">{m.municipality_name}</span>
                          <div className="flex gap-0.5 flex-shrink-0">
                            {cityAssocs.length > 1 && cityAssocs.map(ca => (
                              <div
                                key={ca.association_id}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: assocColorMap[ca.association_id] }}
                                title={associations.find(a => a.id === ca.association_id)?.acronym}
                              />
                            ))}
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {search && groupedByAssoc.size === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum município encontrado para "{search}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border p-3" style={{ background: 'var(--gradient-card)' }}>
      <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-foreground mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
