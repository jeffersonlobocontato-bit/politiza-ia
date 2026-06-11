import { useState, Fragment } from 'react';
import { Network, Award, Plus, Pencil, Trash2, X, GitFork, ChevronDown, ChevronRight } from 'lucide-react';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { macroRegions } from '@/data/mockData';
import { useCampaignMembers, useCreateMember, useUpdateMember, useDeleteMember } from '@/hooks/useCampaignMembers';
import type { DbCampaignMember } from '@/types/database';
import { InfographicDonut, InfographicHBar, CHART_PRIMARY, CHART_MINT } from '@/components/ui/InfographicCharts';
import { HierarchyFlowchart } from '@/components/hierarquia/HierarchyFlowchart';
import { useAssociationForCity } from '@/hooks/useMunicipalityAssociation';
import { useCandidate } from '@/contexts/CandidateContext';

const LEVEL_COLORS: Record<number, string> = {
  1: 'hsl(var(--brand-amber))',
  2: 'hsl(var(--primary))',
  3: 'hsl(var(--brand-cyan))',
  4: 'hsl(var(--brand-green))',
  5: 'hsl(var(--chart-4))',
  6: 'hsl(var(--muted-foreground))',
};
const LEVEL_LABELS: Record<number, string> = {
  1: 'Candidatos Majoritários (Governo / Senado)',
  2: 'Coordenação Estadual',
  3: 'Coordenação Macrorregional',
  4: 'Coordenação Microrregional',
  5: 'Coordenação Municipal',
  6: 'Lideranças Locais',
};

const SECTORAL_GROUPS = [
  {
    label: 'Coordenação Central',
    color: 'hsl(var(--primary))',
    roles: [
      'Coordenação Central',
    ],
  },
  {
    label: 'Coordenações Estaduais',
    color: 'hsl(var(--brand-cyan))',
    roles: [
      'Coordenação Política Estadual',
      'Coordenação Jurídica Eleitoral',
      'Coordenação Operacional / Eventos',
      'Coordenação Administrativa / Financeira',
      'Coordenação Marketing / Comunicação',
      'Coordenação Plano de Governo',
    ],
  },
];

const SECTORAL_ROLES = SECTORAL_GROUPS.flatMap(g => g.roles);

// Roles que aceitam múltiplos membros no mesmo slot (ex.: Coord. Central trio)
const MULTI_MEMBER_ROLES = new Set<string>([
  'Coordenação Central',
  'Coordenação Política Estadual',
  'Coordenação Operacional / Eventos',
  'Coordenação Plano de Governo',
]);

const SUB_ROLES: Record<string, string[]> = {};
const ALL_SUB_ROLES = Object.values(SUB_ROLES).flat();

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  hierarchy_level: string;
  macroregion_id: string;
  microregion: string;
  supervisor_id: string;
  status: string;
  observations: string;
}

const emptyForm = (): MemberForm => ({
  name: '',
  email: '',
  phone: '',
  role: 'Coordenador Municipal',
  hierarchy_level: '5',
  macroregion_id: 'rmc',
  microregion: '',
  supervisor_id: '',
  status: 'ativo',
  observations: '',
});

export default function Hierarquia() {
  const { data: members = [], isLoading } = useCampaignMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const { candidates } = useCandidate();

  const lc = (s: string) => (s ?? '').toLowerCase();
  const openFlowForMember = (memberName: string) => {
    const match = candidates.find(c => {
      const parts = lc(c.name).split(/\s+/).filter(Boolean);
      return parts.length > 0 && parts.every(p => lc(memberName).includes(p));
    });
    setFlowCandidateId(match?.id ?? null);
    setShowFlow(true);
  };

  const [showForm, setShowForm] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [flowCandidateId, setFlowCandidateId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());
  const [geoForm, setGeoForm] = useState<import('@/components/ui/GeoLocationInput').GeoValue>({ city: '', lat: null, lng: null });
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const association = useAssociationForCity(geoForm.city);
  const toggleExpanded = (role: string) => setExpandedRoles(prev => {
    const next = new Set(prev);
    next.has(role) ? next.delete(role) : next.add(role);
    return next;
  });

  const byLevel = [1, 2, 3, 4, 5, 6].map(l => ({
    level: l,
    members: members.filter(m => m.hierarchy_level === l),
  }));
  const ranked = [...members].sort((a, b) => b.completion_rate - a.completion_rate);
  const memberById = new Map(members.map(m => [m.id, m]));
  const subordinateCounts = members.reduce<Record<string, number>>((acc, m) => {
    if (m.supervisor_id) acc[m.supervisor_id] = (acc[m.supervisor_id] ?? 0) + 1;
    return acc;
  }, {});

  const updateForm = (key: keyof MemberForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setGeoForm({ city: '', lat: null, lng: null });
    setShowForm(true);
  };

  const openEdit = (member: DbCampaignMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email ?? '',
      phone: member.phone ?? '',
      role: member.role,
      hierarchy_level: String(member.hierarchy_level),
      macroregion_id: member.macroregion_id ?? 'rmc',
      microregion: member.microregion ?? '',
      supervisor_id: member.supervisor_id ?? '',
      status: member.status,
      observations: member.observations ?? '',
    });
    setGeoForm({ city: member.municipality ?? '', lat: null, lng: null });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !geoForm.city) return;
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      hierarchy_level: parseInt(form.hierarchy_level) as 1|2|3|4|5|6,
      macroregion_id: form.macroregion_id || null,
      microregion: form.microregion || null,
      municipality: geoForm.city || null,
      lat: geoForm.lat,
      lng: geoForm.lng,
      supervisor_id: form.supervisor_id || null,
      actions_managed: 0,
      completion_rate: 0,
      status: form.status,
      observations: form.observations || null,
      user_id: null as string | null,
      created_by: null as string | null,
    };
    if (editingId) {
      await updateMember.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMember.mutateAsync(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setGeoForm({ city: '', lat: null, lng: null });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este membro?')) return;
    await deleteMember.mutateAsync(id);
  };

  // ── Chart data ───────────────────────────────────────────────────────────────
  const levelChartData = [1,2,3,4,5,6].map(l => ({
    name: LEVEL_LABELS[l].replace('Coordenação ', 'Coord. ').replace('Comando ', ''),
    value: members.filter(m => m.hierarchy_level === l).length,
    color: LEVEL_COLORS[l],
  })).filter(d => d.value > 0);

  const statusChartData = [
    { name: 'Ativo', value: members.filter(m => m.status === 'ativo').length, color: '#22c55e' },
    { name: 'Inativo', value: members.filter(m => m.status === 'inativo').length, color: '#ef4444' },
    { name: 'Licença', value: members.filter(m => m.status === 'licenca').length, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const macroCounts = macroRegions.map(m => ({
    name: m.name.replace('Macrorregião ', '').replace('Região ', ''),
    value: members.filter(x => x.macroregion_id === m.id).length,
  })).filter(d => d.value > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Hierarquia da Campanha</h1>
            <p className="text-xs text-muted-foreground">{members.length} membros em {byLevel.filter(b => b.members.length > 0).length} níveis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFlow(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-border bg-card text-foreground hover:bg-accent transition-colors"
          >
            <GitFork className="w-4 h-4 text-primary" /> Ver Fluxograma
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Plus className="w-4 h-4" /> Novo Membro
          </button>
        </div>
      </div>

      <HierarchyFlowchart open={showFlow} onClose={() => setShowFlow(false)} />

      {/* ── Charts Panel ──────────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="px-6 py-4 border-b border-border flex-shrink-0 bg-card/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfographicDonut
              title="Membros por Nível"
              unit="membros"
              data={levelChartData}
              height={190}
            />
            <InfographicDonut
              title="Membros por Status"
              unit="membros"
              data={statusChartData}
              height={190}
            />
            <InfographicHBar
              title="Membros por Macrorregião"
              data={macroCounts}
              accentColor={CHART_MINT}
            />
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-foreground">{editingId ? 'Editar Membro' : 'Novo Membro'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Nome Completo *</label>
                <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Nome do membro" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cargo/Função</label>
                {form.hierarchy_level === '2' ? (
                  <select value={form.role} onChange={e => updateForm('role', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {SECTORAL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <input value={form.role} onChange={e => updateForm('role', e.target.value)} placeholder="Coordenador Regional" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nível Hierárquico</label>
                <select value={form.hierarchy_level} onChange={e => {
                  updateForm('hierarchy_level', e.target.value);
                  if (e.target.value === '2') updateForm('role', SECTORAL_ROLES[0]);
                }} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {[1,2,3,4,5,6].map(l => <option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="email@exemplo.com" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Telefone</label>
                <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="(41) 99999-0000" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Macrorregião</label>
                <select value={form.macroregion_id} onChange={e => updateForm('macroregion_id', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Microrregião</label>
                <input value={form.microregion} onChange={e => updateForm('microregion', e.target.value)} placeholder="Ex: Londrina" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              {(() => {
                const lvl = parseInt(form.hierarchy_level);
                if (lvl < 4) return null;
                const supLvl = lvl - 1;
                const supLabel = LEVEL_LABELS[supLvl];
                let candidates = members.filter(m => m.hierarchy_level === supLvl && m.id !== editingId);
                if (lvl === 4) {
                  candidates = candidates.filter(m => !form.macroregion_id || m.macroregion_id === form.macroregion_id);
                } else if (lvl === 5) {
                  candidates = candidates.filter(m =>
                    (!form.macroregion_id || m.macroregion_id === form.macroregion_id) &&
                    (!form.microregion || (m.microregion ?? '').toLowerCase() === form.microregion.toLowerCase())
                  );
                } else if (lvl === 6) {
                  candidates = candidates.filter(m =>
                    !geoForm.city || (m.municipality ?? '').toLowerCase() === geoForm.city.toLowerCase()
                  );
                }
                return (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Vinculado a — {supLabel}</label>
                    <select value={form.supervisor_id} onChange={e => updateForm('supervisor_id', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="">— Sem vínculo definido —</option>
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.role}{c.municipality ? ` · ${c.municipality}` : ''}
                        </option>
                      ))}
                    </select>
                    {candidates.length === 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">Nenhum {supLabel.toLowerCase()} cadastrado no território selecionado.</p>
                    )}
                  </div>
                );
              })()}
              <div className="sm:col-span-2">
                <GeoLocationInput
                  value={geoForm}
                  onChange={setGeoForm}
                  required
                  label="Município / Localização Exata *"
                  placeholder="Ex: Curitiba, Londrina..."
                />
                {geoForm.city && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Associação de Municípios: </span>
                    {association ? (
                      <span className="font-medium text-foreground">
                        {association.acronym} — {association.name}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground">Não vinculada a uma associação cadastrada</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="licenca">Licença</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Observações</label>
                <textarea value={form.observations} onChange={e => updateForm('observations', e.target.value)} rows={2} placeholder="Notas sobre este membro..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !geoForm.city || createMember.isPending || updateMember.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: 'var(--gradient-primary)' }}
              >
                {createMember.isPending || updateMember.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando membros...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum membro cadastrado.</p>
            <button onClick={openNew} className="mt-3 text-xs text-primary hover:underline">Cadastrar primeiro membro</button>
          </div>
        ) : (
          <>
            {byLevel.map(({ level, members: lvlMembers }) => {
              // For level 2 (Setorial), always show all 8 roles even if empty
              if (level === 2) {
                const extraMembers = lvlMembers.filter(m => !SECTORAL_ROLES.includes(m.role) && !ALL_SUB_ROLES.includes(m.role));

                return (
                  <div
                    key={level}
                    className="rounded-2xl border-2 p-5 relative"
                    style={{
                      borderColor: `${LEVEL_COLORS[level]}55`,
                      background: `linear-gradient(180deg, ${LEVEL_COLORS[level]}0d 0%, transparent 60%)`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md" style={{ backgroundColor: LEVEL_COLORS[level] }}>
                        {level}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">Nível {level} — {LEVEL_LABELS[level]}</div>
                        <div className="text-[11px] text-muted-foreground">{lvlMembers.length} membros nesta camada</div>
                      </div>
                      <div className="flex-1 h-px ml-3" style={{ background: `linear-gradient(to right, ${LEVEL_COLORS[level]}55, transparent)` }} />
                    </div>
                    {SECTORAL_GROUPS.map((group, groupIdx) => {
                      const isCentral = group.label === 'Coordenação Central';
                      // Coleta todos os membros das roles do grupo, e separa "líderes" de "equipe" (subordinados internos)
                      const rawMembers = group.roles.flatMap(role =>
                        lvlMembers.filter(m => m.role === role).map(m => ({ role, m }))
                      );
                      const rawIds = new Set(rawMembers.map(x => x.m.id));
                      const teamByLead: Record<string, DbCampaignMember[]> = {};
                      rawMembers.forEach(({ m }) => {
                        if (m.supervisor_id && rawIds.has(m.supervisor_id)) {
                          (teamByLead[m.supervisor_id] ||= []).push(m);
                        }
                      });
                      const allMatches = group.roles.flatMap(role => {
                        const matches = lvlMembers.filter(
                          m => m.role === role && !(m.supervisor_id && rawIds.has(m.supervisor_id))
                        );
                        if (matches.length === 0) return [{ role, member: null as DbCampaignMember | null, key: role }];
                        return matches.map(m => ({ role, member: m, key: `${role}::${m.id}` }));
                      });

                      // Para Coord. Central: Julio (lead) acima, demais (adjuntos) abaixo
                      let leadCards = allMatches;
                      let peerCards: typeof allMatches = [];
                      if (isCentral) {
                        const leadIdx = allMatches.findIndex(c => {
                          const n = (c.member?.name ?? '').toLowerCase();
                          return n.includes('julio') || n.includes('júlio');
                        });
                        if (leadIdx >= 0) {
                          leadCards = [allMatches[leadIdx]];
                          peerCards = allMatches.filter((_, i) => i !== leadIdx);
                        }
                      }

                      const renderCard = (
                        { role, member, key }: { role: string; member: DbCampaignMember | null; key: string },
                        opts?: { lead?: boolean; subtitle?: string }
                      ) => {
                        const subRoles = SUB_ROLES[role] ?? [];
                        const team = member ? teamByLead[member.id] ?? [] : [];
                        const hasTeam = team.length > 0;
                        const hasSubs = subRoles.length > 0 || hasTeam;
                        const expandKey = member ? `team::${member.id}` : role;
                        const isExpanded = expandedRoles.has(expandKey);
                        return (
                          <Fragment key={key}>
                            <div
                              onClick={hasSubs ? () => toggleExpanded(expandKey) : undefined}
                              className={`rounded-xl border p-4 group relative ${member ? 'border-border' : 'border-dashed border-muted-foreground/30'} ${hasSubs ? 'cursor-pointer hover:border-primary/60 transition-colors' : ''} ${opts?.lead ? 'ring-2 ring-offset-2 ring-offset-background shadow-lg' : ''}`}
                              style={{
                                background: member ? 'var(--gradient-card)' : undefined,
                                ...(opts?.lead ? { ['--tw-ring-color' as any]: group.color } : {}),
                              }}
                            >
                              {opts?.subtitle && (
                                <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white shadow" style={{ backgroundColor: group.color }}>
                                  {opts.subtitle}
                                </div>
                              )}
                              {hasSubs && (
                                <div className="absolute top-3 left-3 text-muted-foreground">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </div>
                              )}
                              {member ? (
                                <>
                                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); openEdit(member); }} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className={`flex items-center gap-3 mb-2 pr-12 ${hasSubs ? 'pl-5' : ''}`}>
                                    <div className={`${opts?.lead ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'} rounded-full flex items-center justify-center font-bold flex-shrink-0`} style={{ backgroundColor: `${group.color}20`, color: group.color }}>
                                      {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className={`${opts?.lead ? 'text-base' : 'text-sm'} font-semibold text-foreground truncate`}>{member.name}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">{member.phone || member.email || ''}</div>
                                    </div>
                                  </div>
                                  <div className={`text-xs font-medium truncate ${hasSubs ? 'pl-5' : ''}`} style={{ color: group.color }}>{role.replace('Coordenador ', '').replace('de ', '')}</div>
                                  <div className={`mt-2 flex items-center gap-2 ${hasSubs ? 'pl-5' : ''}`}>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${member.status === 'ativo' ? 'bg-brand-green/15 text-brand-green' : 'bg-muted text-muted-foreground'}`}>
                                      {member.status}
                                    </span>
                                    {hasTeam && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                                        Equipe: {team.length}
                                      </span>
                                    )}
                                  </div>
                                  {hasTeam && isExpanded && (
                                    <div className="mt-3 pl-5 border-l-2" style={{ borderColor: `${group.color}40` }}>
                                      <div className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: group.color }}>
                                        Equipe de {member.name.split(' ')[0]}
                                      </div>
                                      <div className="space-y-1.5">
                                        {team.map(t => (
                                          <div key={t.id} className="flex items-center gap-2 group/team rounded-md hover:bg-accent/30 p-1 -ml-1" onClick={(e) => e.stopPropagation()}>
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0" style={{ backgroundColor: `${group.color}20`, color: group.color }}>
                                              {t.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="text-xs font-semibold text-foreground truncate">{t.name}</div>
                                              <div className="text-[10px] text-muted-foreground truncate">{t.phone || t.email || 'Membro de equipe'}</div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover/team:opacity-100 transition-opacity">
                                              <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                              <button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    if (hasSubs) return;
                                    e.stopPropagation();
                                    setEditingId(null);
                                    setForm({ ...emptyForm(), hierarchy_level: '2', role });
                                    setGeoForm({ city: '', lat: null, lng: null });
                                    setShowForm(true);
                                  }}
                                  className="w-full flex flex-col items-center justify-center py-3 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Plus className="w-5 h-5 mb-1" />
                                  <span className="text-xs font-medium text-center text-foreground/70">{role.replace('Coordenador ', '').replace('de ', '')}</span>
                                  <span className="text-[10px] mt-0.5 text-foreground/60">{hasSubs ? 'Clique para expandir' : 'Vaga aberta'}</span>
                                </button>
                              )}
                            </div>
                          </Fragment>
                        );
                      };


                      return (
                        <div key={group.label}>
                          {groupIdx > 0 && (
                            <div className="flex items-center gap-3 my-6">
                              <div className="flex-1 h-px bg-border" />
                              <div className="w-2 h-2 rounded-full bg-border" />
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div
                            className="rounded-xl p-4 border"
                            style={{
                              borderColor: `${group.color}40`,
                              background: `linear-gradient(180deg, ${group.color}08, transparent)`,
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: group.color }} />
                              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: group.color }}>{group.label}</span>
                              <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${group.color}40, transparent)` }} />
                            </div>

                            {isCentral && leadCards.length === 1 && peerCards.length > 0 ? (
                              <>
                                <div className="grid grid-cols-1 max-w-md mx-auto mb-4">
                                  {renderCard(leadCards[0], { lead: true, subtitle: 'Coordenador Geral' })}
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="flex-1 h-px" style={{ background: `${group.color}30` }} />
                                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: group.color }}>Coordenação Adjunta</span>
                                  <div className="flex-1 h-px" style={{ background: `${group.color}30` }} />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {peerCards.map(c => renderCard(c, { subtitle: 'Adjunto' }))}
                                </div>
                              </>
                            ) : (
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {allMatches.map(c => renderCard(c))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {extraMembers.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2 ml-1">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outros</span>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {extraMembers.map(m => (
                            <div key={m.id} className="rounded-xl border border-border p-4 group relative" style={{ background: 'var(--gradient-card)' }}>
                              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-3 mb-2 pr-12">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: `${LEVEL_COLORS[level]}20`, color: LEVEL_COLORS[level] }}>
                                  {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-foreground truncate">{m.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (lvlMembers.length === 0) return null;

              // Nível 1 — Bloco Majoritário: Governador acima, Senadores abaixo
              const isMajoritario = level === 1;
              const governor = isMajoritario
                ? lvlMembers.find(m => m.role.toLowerCase().includes('governador')) ?? null
                : null;
              const senators = isMajoritario
                ? lvlMembers.filter(m => m !== governor)
                : [];


              return (
              <div
                key={level}
                className="rounded-2xl border-2 p-5 relative"
                style={{
                  borderColor: `${LEVEL_COLORS[level]}55`,
                  background: `linear-gradient(180deg, ${LEVEL_COLORS[level]}0d 0%, transparent 60%)`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md" style={{ backgroundColor: LEVEL_COLORS[level] }}>
                    {level}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Nível {level} — {LEVEL_LABELS[level]}</div>
                    <div className="text-[11px] text-muted-foreground">{lvlMembers.length} {lvlMembers.length === 1 ? 'membro' : 'membros'}</div>
                  </div>
                  <div className="flex-1 h-px ml-3" style={{ background: `linear-gradient(to right, ${LEVEL_COLORS[level]}55, transparent)` }} />
                </div>
                {(() => {
                  const renderMemberCard = (m: typeof lvlMembers[number], opts?: { highlight?: boolean; badge?: string }) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-4 group relative ${opts?.highlight ? 'border-primary/60 ring-2 ring-primary/30 shadow-xl' : 'border-border'}`}
                      style={{ background: 'var(--gradient-card)' }}
                    >
                      {opts?.badge && (
                        <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow" style={{ backgroundColor: LEVEL_COLORS[level] }}>
                          {opts.badge}
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mb-3 pr-16">
                        <div className={`${opts?.highlight ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'} rounded-full flex items-center justify-center font-bold flex-shrink-0`} style={{ backgroundColor: `${LEVEL_COLORS[level]}20`, color: LEVEL_COLORS[level] }}>
                          {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className={`${opts?.highlight ? 'text-base' : 'text-sm'} font-semibold text-foreground truncate`}>{m.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Ações</div>
                          <div className="text-base font-black text-foreground">{m.actions_managed}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Execução</div>
                          <div className="text-base font-black" style={{ color: m.completion_rate >= 70 ? '#22c55e' : m.completion_rate >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {m.completion_rate}%
                          </div>
                        </div>
                      </div>
                      {m.municipality && (
                        <div className="mt-2 text-[10px] text-muted-foreground">{m.municipality} {m.macroregion_id ? `· ${m.macroregion_id}` : ''}</div>
                      )}
                      {m.supervisor_id && memberById.get(m.supervisor_id) && (
                        <div className="mt-1 text-[10px] text-muted-foreground truncate">
                          ↑ Vinculado a <span className="font-semibold text-foreground">{memberById.get(m.supervisor_id)!.name}</span> · {memberById.get(m.supervisor_id)!.role}
                        </div>
                      )}
                      {subordinateCounts[m.id] > 0 && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          ↓ {subordinateCounts[m.id]} subordinado{subordinateCounts[m.id] > 1 ? 's' : ''} direto{subordinateCounts[m.id] > 1 ? 's' : ''}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.status === 'ativo' ? 'bg-brand-green/15 text-brand-green' : 'bg-muted text-muted-foreground'}`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );

                  if (isMajoritario) {
                    return (
                      <div className="space-y-5">
                        {governor && (
                          <div className="max-w-md mx-auto">
                            {renderMemberCard(governor, { highlight: true, badge: 'Cabeça de Chapa' })}
                          </div>
                        )}
                        {senators.length > 0 && (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Candidatos ao Senado</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {senators.map(m => renderMemberCard(m))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {lvlMembers.map(m => renderMemberCard(m))}
                    </div>
                  );
                })()}
              </div>
              );
            })}

            {/* Ranking */}
            {ranked.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-brand-amber" />
                  <span className="text-sm font-semibold text-foreground">Ranking de Desempenho</span>
                </div>
                <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--gradient-card)' }}>
                  {ranked.map((m, i) => (
                    <div key={m.id} className={`flex items-center gap-4 px-4 py-3 ${i < ranked.length - 1 ? 'border-b border-border' : ''}`}>
                      <span className={`text-sm font-black w-5 flex-shrink-0 ${i === 0 ? 'text-brand-amber' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-brand-amber/60' : 'text-muted-foreground/50'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.role}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${m.completion_rate}%`, backgroundColor: m.completion_rate >= 70 ? '#22c55e' : m.completion_rate >= 50 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span className="text-xs font-bold text-foreground w-8 text-right">{m.completion_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
