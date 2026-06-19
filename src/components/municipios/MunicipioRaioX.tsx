import { useState, useEffect } from 'react';
import {
  ArrowLeft, Building2, Phone, MapPin, Users, UserCheck, Shield,
  BarChart3, Activity, Loader2, Crown, Flag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MunicipioRaioXProps {
  cityName: string;
  onBack: () => void;
  associations: { id: string; acronym: string; name: string }[];
  members: { municipality_name: string; association_id: string }[];
  assocColorMap: Record<string, string>;
}

interface MunicipalityData {
  id: string;
  name: string;
  mayor_name: string | null;
  phone: string | null;
  address: string | null;
  neighborhood: string | null;
  cep: string | null;
}

interface LeaderRow {
  id: string;
  name: string;
  alignment_status: string | null;
  support_status: string | null;
  influence_level: number;
  phone: string | null;
  current_party: string | null;
  coverage_type: string;
}

interface AssetRow {
  id: string;
  name: string;
  type: string;
  alignment_status: string;
  influence_level: number;
  position: string | null;
  phone: string | null;
}

interface CampaignMemberRow {
  id: string;
  name: string;
  role: string;
  status: string;
  phone: string | null;
  hierarchy_level: number | null;
}


interface ActionRow {
  id: string;
  title: string;
  status: string;
  planned_date: string;
  type: string;
}

const ALIGNMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  alinhado:   { label: 'Alinhado',   color: '#10b981', bg: '#10b98120' },
  provavel:   { label: 'Provável',   color: '#60a5fa', bg: '#60a5fa20' },
  neutro:     { label: 'Neutro',     color: '#9ca3af', bg: '#9ca3af20' },
  oposicao:   { label: 'Oposição',   color: '#ef4444', bg: '#ef444420' },
  indefinido: { label: 'Indefinido', color: '#f59e0b', bg: '#f59e0b20' },
};

function AlignmentBadge({ status }: { status: string | null }) {
  const cfg = ALIGNMENT_CONFIG[status || 'indefinido'] || ALIGNMENT_CONFIG.indefinido;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export function MunicipioRaioX({ cityName, onBack, associations, members, assocColorMap }: MunicipioRaioXProps) {
  const [loading, setLoading] = useState(true);
  const [municipality, setMunicipality] = useState<MunicipalityData | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [campaignMembers, setCampaignMembers] = useState<CampaignMemberRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [trackingCount, setTrackingCount] = useState(0);
  const [trackingRounds, setTrackingRounds] = useState<{ title: string; count: number }[]>([]);

  // Associations this city belongs to
  const cityAssocs = members
    .filter(m => m.municipality_name === cityName)
    .map(m => {
      const a = associations.find(a => a.id === m.association_id);
      return a ? { ...a, color: assocColorMap[a.id] } : null;
    })
    .filter(Boolean) as { id: string; acronym: string; name: string; color: string }[];

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      const [munRes, leadRes, assetRes, cmRes, actRes, trackIntRes] = await Promise.all([
        supabase.from('municipalities').select('*').eq('name', cityName).maybeSingle(),
        supabase.from('leaders').select('id, name, alignment_status, support_status, influence_level, phone, current_party, coverage_type')
          .eq('municipality', cityName).is('deleted_at', null).order('influence_level', { ascending: false }),
        supabase.from('political_assets').select('id, name, type, alignment_status, influence_level, position, phone')
          .eq('municipality', cityName).is('deleted_at', null).order('influence_level', { ascending: false }),
        supabase.from('campaign_members').select('id, name, role, status, phone, hierarchy_level')
          .eq('municipality', cityName).order('hierarchy_level').order('name'),
        supabase.from('actions').select('id, title, status, planned_date, type')
          .eq('municipality', cityName).is('deleted_at', null).order('planned_date', { ascending: false }).limit(10),
        supabase.from('tracking_interviews').select('id, round_id, municipality')
          .eq('municipality', cityName),
      ]);

      setMunicipality(munRes.data || { id: '', name: cityName, mayor_name: null, phone: null, address: null, neighborhood: null, cep: null });
      setLeaders(leadRes.data || []);
      setAssets(assetRes.data || []);
      setCampaignMembers(cmRes.data || []);
      setActions(actRes.data || []);

      const interviews = trackIntRes.data || [];
      setTrackingCount(interviews.length);

      // Group interviews by round
      if (interviews.length > 0) {
        const roundIds = [...new Set(interviews.map(i => i.round_id))];
        const { data: rounds } = await supabase
          .from('tracking_rounds')
          .select('id, title')
          .in('id', roundIds);
        
        const roundMap: Record<string, { title: string; count: number }> = {};
        interviews.forEach(i => {
          if (!roundMap[i.round_id]) {
            const r = rounds?.find(r => r.id === i.round_id);
            roundMap[i.round_id] = { title: r?.title || 'Rodada', count: 0 };
          }
          roundMap[i.round_id].count++;
        });
        setTrackingRounds(Object.values(roundMap));
      }

      setLoading(false);
    }
    fetchAll();
  }, [cityName]);

  // Alignment summary for leaders + assets
  const alignmentSummary = (() => {
    const all = [
      ...leaders.map(l => l.alignment_status || 'indefinido'),
      ...assets.map(a => a.alignment_status || 'indefinido'),
    ];
    const counts: Record<string, number> = {};
    all.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    return counts;
  })();

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
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">{cityName}</h1>
              {cityAssocs.map(a => (
                <span
                  key={a.id}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: a.color, backgroundColor: `${a.color}20` }}
                >
                  {a.acronym}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Raio X do município · Todos os dados da plataforma</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Lideranças', value: leaders.length, icon: Crown, color: 'hsl(var(--primary))' },
            { label: 'Ativos Políticos', value: assets.length, icon: Users, color: '#60a5fa' },
            { label: 'Equipe Campanha', value: campaignMembers.length, icon: UserCheck, color: '#a78bfa' },
            { label: 'Ações', value: actions.length, icon: Flag, color: '#f59e0b' },
            { label: 'Entrevistas Tracking', value: trackingCount, icon: Activity, color: '#2dd4bf' },
            { label: 'Associações', value: cityAssocs.length, icon: Building2, color: '#f472b6' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border p-3" style={{ background: 'var(--gradient-card)' }}>
              <k.icon className="w-4 h-4 mb-1.5" style={{ color: k.color }} />
              <div className="text-xl font-black text-foreground">{k.value}</div>
              <div className="text-[10px] text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Alignment summary bar */}
        {(leaders.length > 0 || assets.length > 0) && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">Mapa de Alinhamento</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(ALIGNMENT_CONFIG).map(([key, cfg]) => {
                const count = alignmentSummary[key] || 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                    <span className="text-xs text-foreground font-semibold">{count}</span>
                    <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Official data */}
        {municipality && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Dados Oficiais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Prefeito(a)</div>
                <div className="text-sm font-semibold text-foreground">{municipality.mayor_name || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Telefone</div>
                <div className="text-sm text-foreground flex items-center gap-1">
                  {municipality.phone ? <><Phone className="w-3 h-3 text-muted-foreground" />{municipality.phone}</> : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">Endereço</div>
                <div className="text-sm text-foreground flex items-start gap-1">
                  {municipality.address ? <><MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />{municipality.address}</> : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">CEP</div>
                <div className="text-sm text-foreground">{municipality.cep || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaders */}
        {leaders.length > 0 && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" /> Lideranças ({leaders.length})
            </h3>
            <div className="space-y-2">
              {leaders.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{l.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {l.current_party && <span className="mr-2">{l.current_party}</span>}
                        Influência: {l.influence_level}/10
                      </div>
                    </div>
                  </div>
                  <AlignmentBadge status={l.alignment_status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Political Assets */}
        {assets.length > 0 && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Ativos Políticos ({assets.length})
            </h3>
            <div className="space-y-2">
              {assets.map(a => {
                const typeLabel = a.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {typeLabel}
                          {a.position && <> · {a.position}</>}
                          {' · '}Influência: {a.influence_level}/10
                        </div>
                      </div>
                    </div>
                    <AlignmentBadge status={a.alignment_status} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Campaign Members */}
        {campaignMembers.length > 0 && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" /> Equipe de Campanha ({campaignMembers.length})
            </h3>
            <div className="space-y-2">
              {campaignMembers.map(cm => (
                <div key={cm.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{cm.name}</div>
                      <div className="text-[10px] text-muted-foreground">{cm.role}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cm.status === 'ativo' ? 'text-emerald-400 bg-emerald-400/10' : 'text-muted-foreground bg-muted'
                  }`}>
                    {cm.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" /> Ações Recentes ({actions.length})
            </h3>
            <div className="space-y-2">
              {actions.map(a => {
                const statusColors: Record<string, string> = {
                  realizada: 'text-emerald-400 bg-emerald-400/10',
                  em_andamento: 'text-blue-400 bg-blue-400/10',
                  atrasada: 'text-red-400 bg-red-400/10',
                  prevista: 'text-muted-foreground bg-muted',
                  confirmada: 'text-amber-400 bg-amber-400/10',
                  cancelada: 'text-red-300 bg-red-300/10',
                  pendente_validacao: 'text-orange-400 bg-orange-400/10',
                };
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(a.planned_date).toLocaleDateString('pt-BR')} · {a.type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[a.status] || 'text-muted-foreground bg-muted'}`}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking */}
        {trackingCount > 0 && (
          <div className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Tracking Eleitoral ({trackingCount} entrevistas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trackingRounds.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/50">
                  <div className="text-sm font-semibold text-foreground">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground">{r.count} entrevistas coletadas</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {leaders.length === 0 && assets.length === 0 && campaignMembers.length === 0 && actions.length === 0 && trackingCount === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum dado adicional cadastrado para {cityName} além dos dados oficiais.
          </div>
        )}
      </div>
    </div>
  );
}
