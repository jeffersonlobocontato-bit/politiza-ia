import { useState, useEffect, useMemo } from 'react';
import { Building2, Search, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MunicipioRaioX } from '@/components/municipios/MunicipioRaioX';

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

export default function Municipios() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [members, setMembers] = useState<AssocMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

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

  // Group members by association, apply search filter
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

  // Unique municipalities count
  const uniqueCities = useMemo(() => {
    return new Set(members.map(m => m.municipality_name)).size;
  }, [members]);

  // Association color map for badges
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-base font-bold text-foreground">Municípios</h1>
              <p className="text-xs text-muted-foreground">Raio X completo de cada cidade · {uniqueCities} municípios</p>
            </div>
          </div>
          <div className="relative w-64">
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

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {associations.map(assoc => {
          const cityList = groupedByAssoc.get(assoc.id);
          if (!cityList || cityList.length === 0) return null;
          const color = assocColorMap[assoc.id];

          return (
            <div key={assoc.id}>
              {/* Association header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <Building2 className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{assoc.acronym}</h2>
                  <p className="text-[10px] text-muted-foreground">{assoc.name} · {cityList.length} municípios</p>
                </div>
              </div>

              {/* Cities grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {cityList.map(m => {
                  // Check if city belongs to multiple associations
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
    </div>
  );
}
