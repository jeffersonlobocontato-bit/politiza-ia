import { useState, useMemo } from 'react';
import { Users, Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { macroRegions } from '@/data/mockData';
import { usePoliticalAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/usePoliticalAssets';
import { useLeadershipProfiles, useAssetLeadershipLinks, useSetAssetProfiles } from '@/hooks/useLeadershipProfiles';
import { LeadershipProfileSelect } from '@/components/leadership/LeadershipProfileSelect';
import type { DbPoliticalAsset, DbAssetType, DbAlignmentStatus } from '@/types/database';
import { InfographicDonut, InfographicHBar, CHART_PRIMARY, CHART_MINT } from '@/components/ui/InfographicCharts';

const ALIGNMENT_COLORS: Record<DbAlignmentStatus, string> = {
  alinhado:   '#22c55e',
  provavel:   '#3b82f6',
  neutro:     '#6b7280',
  oposicao:   '#ef4444',
  indefinido: '#f59e0b',
};
const ALIGNMENT_LABELS: Record<DbAlignmentStatus, string> = {
  alinhado:   'Alinhado',
  provavel:   'Provável',
  neutro:     'Neutro',
  oposicao:   'Oposição',
  indefinido: 'Indefinido',
};

const ASSET_TYPES: { value: DbAssetType; label: string }[] = [
  { value: 'prefeito',               label: 'Prefeito' },
  { value: 'ex_prefeito',            label: 'Ex-Prefeito' },
  { value: 'pretenso_prefeito',      label: 'Pretenso Prefeito' },
  { value: 'vereador',               label: 'Vereador' },
  { value: 'ex_vereador',            label: 'Ex-Vereador' },
  { value: 'pretenso_vereador',      label: 'Pretenso Vereador' },
  { value: 'lideranca_comunitaria',  label: 'Liderança Comunitária' },
  { value: 'lideranca_empresarial',  label: 'Liderança Empresarial' },
  { value: 'lideranca_religiosa',    label: 'Liderança Religiosa' },
  { value: 'presidente_entidade',    label: 'Presidente de Entidade' },
  { value: 'influenciador_regional', label: 'Influenciador Regional' },
  { value: 'coordenador_partidario', label: 'Coord. Partidário' },
];

const ALIGNMENT_OPTIONS: { value: DbAlignmentStatus; label: string }[] = [
  { value: 'alinhado',   label: 'Alinhado' },
  { value: 'provavel',   label: 'Provável' },
  { value: 'neutro',     label: 'Neutro' },
  { value: 'oposicao',   label: 'Oposição' },
  { value: 'indefinido', label: 'Indefinido' },
];

interface AssetForm {
  name: string;
  type: DbAssetType;
  macroregion_id: string;
  position: string;
  influence_level: string;
  alignment_status: DbAlignmentStatus;
  support_status: string;
  phone: string;
  email: string;
  observations: string;
  relationship_owner: string;
}

const emptyForm = (): AssetForm => ({
  name: '',
  type: 'lideranca_comunitaria',
  macroregion_id: 'rmc',
  position: '',
  influence_level: '5',
  alignment_status: 'neutro',
  support_status: '',
  phone: '',
  email: '',
  observations: '',
  relationship_owner: '',
});

export default function AtivosPoliticos() {
  const { data: assets = [], isLoading } = usePoliticalAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const { data: leadershipProfiles = [] } = useLeadershipProfiles(true);
  const assetIds = useMemo(() => assets.map(a => a.id), [assets]);
  const { data: assetLinks = [] } = useAssetLeadershipLinks(assetIds);
  const setAssetProfiles = useSetAssetProfiles();

  const [search, setSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState('all');
  const [alignFilter, setAlignFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm());
  const [geoForm, setGeoForm] = useState<import('@/components/ui/GeoLocationInput').GeoValue>({ city: '', lat: null, lng: null });
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.name.toLowerCase().includes(q) || (a.municipality ?? '').toLowerCase().includes(q);
    const matchMacro = macroFilter === 'all' || a.macroregion_id === macroFilter;
    const matchAlign = alignFilter === 'all' || a.alignment_status === alignFilter;
    return matchSearch && matchMacro && matchAlign;
  });

  const updateForm = (key: keyof AssetForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setGeoForm({ city: '', lat: null, lng: null });
    setSelectedProfileIds([]);
    setShowForm(true);
  };

  const openEdit = (asset: DbPoliticalAsset) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      type: asset.type,
      macroregion_id: asset.macroregion_id ?? 'rmc',
      position: asset.position ?? '',
      influence_level: String(asset.influence_level),
      alignment_status: asset.alignment_status,
      support_status: asset.support_status ?? '',
      phone: asset.phone ?? '',
      email: asset.email ?? '',
      observations: asset.observations ?? '',
      relationship_owner: asset.relationship_owner ?? '',
    });
    setGeoForm({ city: asset.municipality ?? '', lat: asset.lat ?? null, lng: asset.lng ?? null });
    setSelectedProfileIds(assetLinks.filter(l => l.asset_id === asset.id).map(l => l.profile_id));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !geoForm.city) return;
    const payload = {
      name: form.name,
      type: form.type,
      municipality: geoForm.city || null,
      microregion: null as string | null,
      macroregion_id: form.macroregion_id || null,
      position: form.position || null,
      influence_level: parseInt(form.influence_level) || 5,
      alignment_status: form.alignment_status,
      support_status: form.support_status || null,
      phone: form.phone || null,
      email: form.email || null,
      lat: geoForm.lat,
      lng: geoForm.lng,
      observations: form.observations || null,
      relationship_owner: form.relationship_owner || null,
      created_by: null as string | null,
      updated_by: null as string | null,
    };
    let assetId = editingId;
    if (editingId) {
      await updateAsset.mutateAsync({ id: editingId, ...payload });
    } else {
      const result = await createAsset.mutateAsync(payload);
      assetId = (result as any)?.id ?? null;
    }
    if (assetId) {
      await setAssetProfiles.mutateAsync({ assetId, profileIds: selectedProfileIds });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setGeoForm({ city: '', lat: null, lng: null });
    setSelectedProfileIds([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este ativo político?')) return;
    await deleteAsset.mutateAsync(id);
  };

  // ── Chart data ───────────────────────────────────────────────────────────────
  const alignChartData = ALIGNMENT_OPTIONS.map(a => ({
    name: a.label,
    value: assets.filter(x => x.alignment_status === a.value).length,
    color: ALIGNMENT_COLORS[a.value],
  })).filter(d => d.value > 0);

  const typeChartData = ASSET_TYPES.map(t => ({
    name: t.label,
    value: assets.filter(x => x.type === t.value).length,
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  const macroCounts = macroRegions.map(m => ({
    name: m.name.replace('Macrorregião ', '').replace('Região ', ''),
    value: assets.filter(x => x.macroregion_id === m.id).length,
  })).filter(d => d.value > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Ativos Políticos</h1>
            <p className="text-xs text-muted-foreground">{assets.length} ativos cadastrados</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Plus className="w-4 h-4" /> Novo Ativo
        </button>
      </div>

      {/* ── Charts Panel ──────────────────────────────────────────────────────── */}
      {assets.length > 0 && (
        <div className="px-6 py-4 border-b border-border flex-shrink-0 bg-card/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfographicDonut
              title="Distribuição por Alinhamento"
              unit="ativos"
              data={alignChartData}
              height={190}
            />
            <InfographicHBar
              title="Ativos por Tipo"
              subtitle="top 8"
              data={typeChartData}
              accentColor={CHART_PRIMARY}
            />
            <InfographicHBar
              title="Ativos por Macrorregião"
              data={macroCounts}
              accentColor={CHART_MINT}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border flex gap-3 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou município..." className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={macroFilter} onChange={e => setMacroFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todas as regiões</option>
          {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={alignFilter} onChange={e => setAlignFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todos os alinhamentos</option>
          {ALIGNMENT_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-foreground">{editingId ? 'Editar Ativo Político' : 'Novo Ativo Político'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Nome *</label>
                <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Nome completo" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Tipo</label>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cargo/Posição</label>
                <input value={form.position} onChange={e => updateForm('position', e.target.value)} placeholder="Ex: Prefeito de Curitiba" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="sm:col-span-2">
                <GeoLocationInput
                  value={geoForm}
                  onChange={setGeoForm}
                  required
                  label="Município / Localização Exata *"
                  placeholder="Ex: Curitiba, Londrina..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Macrorregião</label>
                <select value={form.macroregion_id} onChange={e => updateForm('macroregion_id', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Alinhamento</label>
                <select value={form.alignment_status} onChange={e => updateForm('alignment_status', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {ALIGNMENT_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Status de Apoio</label>
                <input value={form.support_status} onChange={e => updateForm('support_status', e.target.value)} placeholder="Ex: Apoio confirmado" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Grau de Influência (1-10)</label>
                <input type="number" min="1" max="10" value={form.influence_level} onChange={e => updateForm('influence_level', e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Telefone</label>
                <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="(41) 99999-0000" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="email@dominio.com" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Responsável pelo Relacionamento</label>
                <input value={form.relationship_owner} onChange={e => updateForm('relationship_owner', e.target.value)} placeholder="Coordenador responsável" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="sm:col-span-2">
                <LeadershipProfileSelect
                  selectedIds={selectedProfileIds}
                  onChange={setSelectedProfileIds}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Observações Estratégicas</label>
                <textarea value={form.observations} onChange={e => updateForm('observations', e.target.value)} rows={3} placeholder="Notas estratégicas sobre este ativo..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !geoForm.city || createAsset.isPending || updateAsset.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: 'var(--gradient-primary)' }}
              >
                {createAsset.isPending || updateAsset.isPending ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Ativo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Carregando ativos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum ativo encontrado.</p>
            <button onClick={openNew} className="mt-3 text-xs text-primary hover:underline">Cadastrar primeiro ativo</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(asset => {
              const ac = ALIGNMENT_COLORS[asset.alignment_status] ?? '#6b7280';
              return (
                <div key={asset.id} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-all group relative" style={{ background: 'var(--gradient-card)' }}>
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(asset)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(asset.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between mb-3 pr-16">
                    <div>
                      <div className="text-sm font-bold text-foreground">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.position || ASSET_TYPES.find(t => t.value === asset.type)?.label}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0" style={{ color: ac, borderColor: `${ac}40`, backgroundColor: `${ac}15` }}>
                      {ALIGNMENT_LABELS[asset.alignment_status] ?? asset.alignment_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{ASSET_TYPES.find(t => t.value === asset.type)?.label ?? asset.type}</span>
                    <span className="text-[10px] text-muted-foreground">{asset.municipality}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Influência</div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i < asset.influence_level ? ac : 'hsl(var(--border))' }} />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">Apoio</div>
                      <div className="text-xs font-medium text-foreground">{asset.support_status ?? '—'}</div>
                    </div>
                  </div>
                  {asset.observations && (
                    <div className="mt-2 text-[11px] text-muted-foreground italic border-t border-border pt-2 line-clamp-2">{asset.observations}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
