import { useState, useEffect } from 'react';
import { Globe, ChevronRight, Users, MapPin, Phone, Mail, ExternalLink, Building2, Loader2, X, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Association {
  id: string;
  acronym: string;
  name: string;
  polo_city: string | null;
  president_name: string | null;
  president_city: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  website: string | null;
  members_count: number;
}

interface AssociationMember {
  id: string;
  municipality_name: string;
}

interface MunicipalityDetail {
  id: string;
  name: string;
  mayor_name: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  cep: string | null;
}

export default function Territorios() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssoc, setSelectedAssoc] = useState<string | null>(null);
  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityDetail | null>(null);
  const [loadingMunicipality, setLoadingMunicipality] = useState(false);

  useEffect(() => {
    async function fetchAssociations() {
      const { data: assocs } = await supabase
        .from('municipality_associations')
        .select('*')
        .order('acronym');

      const { data: allMembers } = await supabase
        .from('association_members')
        .select('association_id');

      if (assocs) {
        const countMap: Record<string, number> = {};
        allMembers?.forEach(m => {
          countMap[m.association_id] = (countMap[m.association_id] || 0) + 1;
        });

        setAssociations(assocs.map(a => ({
          ...a,
          members_count: countMap[a.id] || 0,
        })));
      }
      setLoading(false);
    }
    fetchAssociations();
  }, []);

  useEffect(() => {
    if (!selectedAssoc) return;
    setLoadingMembers(true);
    supabase
      .from('association_members')
      .select('id, municipality_name')
      .eq('association_id', selectedAssoc)
      .order('municipality_name')
      .then(({ data }) => {
        setMembers(data || []);
        setLoadingMembers(false);
      });
  }, [selectedAssoc]);

  const selected = associations.find(a => a.id === selectedAssoc);
  const totalMunicipios = 399; // Total de municípios únicos do Paraná

  // Palette for card accents
  const CARD_COLORS = [
    '#2dd4bf', '#60a5fa', '#a78bfa', '#f59e0b', '#ef4444',
    '#34d399', '#f472b6', '#818cf8', '#fb923c', '#06b6d4',
    '#8b5cf6', '#10b981', '#e879f9', '#facc15', '#6366f1',
    '#14b8a6', '#f87171', '#38bdf8', '#c084fc',
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Gestão Territorial</h1>
            <p className="text-xs text-muted-foreground">Estado → Associações de Municípios → Municípios</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* State KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Associações', value: String(associations.length), icon: Building2, color: 'hsl(var(--primary))' },
            { label: 'Municípios do PR', value: String(totalMunicipios), icon: MapPin, color: 'hsl(var(--brand-cyan))' },
            { label: 'Presidentes', value: String(associations.filter(a => a.president_name).length), icon: Users, color: 'hsl(var(--brand-green))' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-xl font-black text-foreground">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <button onClick={() => setSelectedAssoc(null)} className="text-primary hover:underline font-medium">
            Paraná
          </button>
          {selectedAssoc && selected && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{selected.acronym}</span>
            </>
          )}
        </div>

        {!selectedAssoc ? (
          /* Associations Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {associations.map((assoc, idx) => {
              const color = CARD_COLORS[idx % CARD_COLORS.length];
              return (
                <button
                  key={assoc.id}
                  onClick={() => setSelectedAssoc(assoc.id)}
                  className="rounded-xl border border-border p-4 text-left hover:border-primary/50 transition-all hover:scale-[1.02] group"
                  style={{ background: 'var(--gradient-card)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                      <Building2 className="w-5 h-5" style={{ color }} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="font-bold text-base text-foreground mb-1">{assoc.acronym}</div>
                  <div className="text-[11px] text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{assoc.name}</div>

                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">Polo: <span className="text-foreground font-medium">{assoc.polo_city || '—'}</span></span>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" style={{ color }} />
                      <span className="text-sm font-black text-foreground">{assoc.members_count}</span>
                      <span className="text-[10px] text-muted-foreground">municípios</span>
                    </div>
                    {assoc.president_name && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        Pres. {assoc.president_name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : selected ? (
          /* Association detail */
          <div>
            {/* Header card */}
            <div className="rounded-xl border border-border p-5 mb-4" style={{ background: 'var(--gradient-card)' }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-foreground">{selected.acronym}</h2>
                  <p className="text-xs text-muted-foreground">{selected.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Presidente</div>
                  <div className="text-sm font-semibold text-foreground">{selected.president_name || '—'}</div>
                  {selected.president_city && (
                    <div className="text-[10px] text-muted-foreground">Prefeito(a) de {selected.president_city}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Cidade Polo</div>
                  <div className="text-sm font-semibold text-foreground">{selected.polo_city || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Municípios</div>
                  <div className="text-sm font-semibold text-primary">{selected.members_count}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Contato</div>
                  <div className="flex flex-col gap-1">
                    {selected.phone && (
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {selected.phone}
                      </div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-1 text-xs text-foreground truncate">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {selected.email}
                      </div>
                    )}
                    {selected.website && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <ExternalLink className="w-3 h-3" />
                        {selected.website}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {selected.address && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{selected.address}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Municipality list */}
            {loadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Municípios Integrantes ({members.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {members.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      style={{ background: 'var(--gradient-card)' }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{m.municipality_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
