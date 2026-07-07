import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Pencil, Trash2, X, Upload, ExternalLink, Lock, Shield, Eye, FileText } from 'lucide-react';
import { RaioXModal, openRaioX } from '@/components/ativos/RaioXModal';
import { useAuth } from '@/contexts/AuthContext';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { macroRegions } from '@/data/mockData';
import { usePoliticalAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/usePoliticalAssets';
import { useUnifiedPoliticalAssets, type UnifiedAsset, type UnifiedAssetType } from '@/hooks/useUnifiedPoliticalAssets';
import { useLeadershipProfiles, useAssetLeadershipLinks, useSetAssetProfiles } from '@/hooks/useLeadershipProfiles';
import { LeadershipProfileSelect } from '@/components/leadership/LeadershipProfileSelect';
import type { DbAssetType, DbAlignmentStatus } from '@/types/database';
import { InfographicDonut, InfographicHBar, CHART_PRIMARY, CHART_MINT } from '@/components/ui/InfographicCharts';
import { ImportAssetsDialog } from '@/components/ativos/ImportAssetsDialog';
import { useAssociationForCity } from '@/hooks/useMunicipalityAssociation';
import { AssetProfileSheet } from '@/components/ativos/AssetProfileSheet';
import { RaioXReviewDialog, type PendingRaioX } from '@/components/ativos/RaioXReviewDialog';
import { useCreateRaioXReport, useRaioXReports, assetKeyFor } from '@/hooks/useRaioXReports';

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
  { value: 'vice_prefeito',          label: 'Vice-Prefeito' },
  { value: 'ex_prefeito',            label: 'Ex-Prefeito' },
  { value: 'pretenso_prefeito',      label: 'Pretenso Prefeito' },
  { value: 'vereador',               label: 'Vereador' },
  { value: 'ex_vereador',            label: 'Ex-Vereador' },
  { value: 'pretenso_vereador',      label: 'Pretenso Vereador' },
  { value: 'deputado_estadual',      label: 'Deputado Estadual' },
  { value: 'deputado_federal',       label: 'Deputado Federal' },
  { value: 'lideranca_comunitaria',  label: 'Liderança Comunitária' },
  { value: 'lideranca_empresarial',  label: 'Liderança Empresarial' },
  { value: 'lideranca_religiosa',    label: 'Liderança Religiosa' },
  { value: 'presidente_entidade',    label: 'Presidente de Entidade' },
  { value: 'influenciador_regional', label: 'Influenciador Regional' },
  { value: 'coordenador_partidario', label: 'Coord. Partidário' },
];

// Rótulos de exibição extendidos (inclui tipos virtuais agregados)
const UNIFIED_TYPE_LABELS: Record<UnifiedAssetType, string> = {
  prefeito: 'Prefeito',
  vice_prefeito: 'Vice-Prefeito',
  deputado_estadual: 'Deputado Estadual',
  deputado_federal: 'Deputado Federal',
  ex_prefeito: 'Ex-Prefeito',
  pretenso_prefeito: 'Pretenso Prefeito',
  vereador: 'Vereador',
  ex_vereador: 'Ex-Vereador',
  pretenso_vereador: 'Pretenso Vereador',
  lideranca_comunitaria: 'Liderança Comunitária',
  lideranca_empresarial: 'Liderança Empresarial',
  lideranca_religiosa: 'Liderança Religiosa',
  presidente_entidade: 'Presidente de Entidade',
  influenciador_regional: 'Influenciador Regional',
  coordenador_partidario: 'Coord. Partidário',
  candidato: 'Candidato',
  coord_geral: 'Coord. Geral',
  coord_estadual: 'Coord. Estadual',
  coord_macro: 'Coord. Macrorregional',
  coord_micro: 'Coord. Microrregional',
  coord_cidade: 'Coord. Municipal',
  publico_eventos: 'PÚBLICO EVENTOS',
};

const ORIGIN_BADGE_COLORS: Record<UnifiedAsset['origin'], string> = {
  nativo: '#6b7280',
  candidato: '#1F5AB4',
  coordenador: '#2FA85A',
  evento: '#E2A23B',
};


const ALIGNMENT_OPTIONS: { value: DbAlignmentStatus; label: string }[] = [
  { value: 'alinhado',   label: 'Alinhado' },
  { value: 'provavel',   label: 'Provável' },
  { value: 'neutro',     label: 'Neutro' },
  { value: 'oposicao',   label: 'Oposição' },
  { value: 'indefinido', label: 'Indefinido' },
];

interface AssetForm {
  name: string;
  nickname: string;
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
  referred_by: string;
}

const emptyForm = (): AssetForm => ({
  name: '',
  nickname: '',
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
  referred_by: '',
});

export default function AtivosPoliticos() {
  const { data: assets = [], isLoading } = useUnifiedPoliticalAssets();
  const { data: rawAssets = [] } = usePoliticalAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const { data: leadershipProfiles = [] } = useLeadershipProfiles(true);
  const rawAssetIds = useMemo(() => rawAssets.map(a => a.id), [rawAssets]);
  const { data: assetLinks = [] } = useAssetLeadershipLinks(rawAssetIds);
  const setAssetProfiles = useSetAssetProfiles();

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [macroFilter, setMacroFilter] = useState('all');
  const [alignFilter, setAlignFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState<'all' | UnifiedAsset['origin']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | UnifiedAssetType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm());
  const [geoForm, setGeoForm] = useState<import('@/components/ui/GeoLocationInput').GeoValue>({ city: '', lat: null, lng: null });
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
  const association = useAssociationForCity(geoForm.city);
  const { roles } = useAuth();
  const canRaioX = roles.some(r => ['admin_master', 'coordenador_estadual', 'coordenador_geral'].includes(r));
  const [raioXAsset, setRaioXAsset] = useState<UnifiedAsset | null>(null);
  const [profileAsset, setProfileAsset] = useState<UnifiedAsset | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingRaioX | null>(null);
  const createReport = useCreateRaioXReport();
  const { data: allReports = [] } = useRaioXReports();

  // Mapa session_id → ativo (para saber a que card o RAIO-X que voltou pertence)
  const sessionMap = useRef<Map<string, UnifiedAsset>>(new Map());

  // Contagem de relatórios por ativo (para badge no card)
  const reportsByAsset = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allReports) {
      map.set(r.asset_key, (map.get(r.asset_key) ?? 0) + 1);
    }
    return map;
  }, [allReports]);

  const openRaioXForAsset = (asset: UnifiedAsset, contexto = '') => {
    const nome = (asset.name ?? '').trim();
    const municipio = (asset.municipality ?? '').trim();
    if (nome.length > 3 && municipio.length > 2) {
      const sid = openRaioX({ nome, municipio, partido: '', cargo: asset.position ?? '', contexto });
      sessionMap.current.set(sid, asset);
    } else {
      setRaioXAsset(asset);
    }
  };

  const handleRaioX = (asset: UnifiedAsset) => openRaioXForAsset(asset);

  // Ouve o postMessage do painel RAIO-X (public/raio-x.html)
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.type !== 'raiox:save' || !data.session_id) return;
      const asset = sessionMap.current.get(data.session_id);
      if (!asset) return;
      setPendingReview({
        session_id: data.session_id,
        html: String(data.html ?? ''),
        markdown: data.markdown,
        model: data.model,
        context_input: data.context_input,
        subject: data.subject ?? {
          name: asset.name,
          municipality: asset.municipality ?? '',
          position: asset.position ?? '',
        },
        asset: {
          origin: asset.origin,
          source_id: asset.origin === 'nativo' ? asset.source_id : null,
          asset_key: assetKeyFor(asset.name, asset.municipality),
        },
      });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const confirmSaveReport = async (reviewerNotes: string) => {
    if (!pendingReview) return;
    await createReport.mutateAsync({
      asset_origin: pendingReview.asset.origin,
      asset_source_id: pendingReview.asset.source_id,
      asset_key: pendingReview.asset.asset_key,
      subject_name: pendingReview.subject.name,
      subject_municipality: pendingReview.subject.municipality ?? null,
      subject_party: pendingReview.subject.party ?? null,
      subject_position: pendingReview.subject.position ?? null,
      context_input: pendingReview.context_input ?? null,
      report_html: pendingReview.html,
      report_markdown: pendingReview.markdown ?? null,
      model: pendingReview.model ?? null,
      reviewer_notes: reviewerNotes || null,
    });
    setPendingReview(null);
  };

  const redoAnalysis = () => {
    if (!pendingReview) return;
    const asset = sessionMap.current.get(pendingReview.session_id);
    setPendingReview(null);
    if (asset) openRaioXForAsset(asset, pendingReview.context_input ?? '');
  };


  // Lista única de cidades presentes nos ativos (respeita filtro de macrorregião)
  const cityOptions = useMemo(() => {
    const set = new Map<string, string>(); // key (normalized) -> display
    assets.forEach(a => {
      if (!a.municipality) return;
      if (macroFilter !== 'all' && a.macroregion_id !== macroFilter) return;
      const key = a.municipality.trim().toLowerCase();
      if (!set.has(key)) set.set(key, a.municipality.trim());
    });
    return Array.from(set.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [assets, macroFilter]);

  // Tipos presentes nos ativos para o dropdown dinâmico
  const typeOptions = useMemo(() => {
    const set = new Set<UnifiedAssetType>();
    assets.forEach(a => { if (a.type) set.add(a.type); });
    return Array.from(set)
      .map(t => ({ value: t, label: UNIFIED_TYPE_LABELS[t] ?? t }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [assets]);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.name.toLowerCase().includes(q) || (a.municipality ?? '').toLowerCase().includes(q);
    const matchCity = cityFilter === 'all' || (a.municipality ?? '').trim().toLowerCase() === cityFilter;
    const matchMacro = macroFilter === 'all' || a.macroregion_id === macroFilter;
    const matchAlign = alignFilter === 'all' || a.alignment_status === alignFilter;
    const matchOrigin = originFilter === 'all' || a.origin === originFilter;
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    return matchSearch && matchCity && matchMacro && matchAlign && matchOrigin && matchType;
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

  const openEdit = (asset: UnifiedAsset) => {
    if (asset.origin !== 'nativo') return;
    const raw = rawAssets.find(r => r.id === asset.source_id);
    if (!raw) return;
    setEditingId(raw.id);
    setForm({
      name: raw.name,
      nickname: raw.nickname ?? '',
      type: raw.type,
      macroregion_id: raw.macroregion_id ?? 'rmc',
      position: raw.position ?? '',
      influence_level: String(raw.influence_level),
      alignment_status: raw.alignment_status,
      support_status: raw.support_status ?? '',
      phone: raw.phone ?? '',
      email: raw.email ?? '',
      observations: raw.observations ?? '',
      relationship_owner: raw.relationship_owner ?? '',
      referred_by: (raw as any).referred_by ?? '',
    });
    setGeoForm({ city: raw.municipality ?? '', lat: raw.lat ?? null, lng: raw.lng ?? null });
    setSelectedProfileIds(assetLinks.filter(l => l.asset_id === raw.id).map(l => l.profile_id));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !geoForm.city) return;
    const payload = {
      name: form.name,
      nickname: form.nickname || null,
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
      referred_by: form.referred_by || null,
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

  const typeChartData = (Object.keys(UNIFIED_TYPE_LABELS) as UnifiedAssetType[]).map(t => ({
    name: UNIFIED_TYPE_LABELS[t],
    value: assets.filter(x => x.type === t).length,
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  const macroCounts = macroRegions.map(m => ({
    name: m.name.replace('Macrorregião ', '').replace('Região ', ''),
    value: assets.filter(x => x.macroregion_id === m.id).length,
  })).filter(d => d.value > 0);

  const originCounts = {
    nativo: assets.filter(a => a.origin === 'nativo').length,
    candidato: assets.filter(a => a.origin === 'candidato').length,
    coordenador: assets.filter(a => a.origin === 'coordenador').length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Ativos Políticos</h1>
            <p className="text-xs text-muted-foreground">
              {assets.length} ativos · {originCounts.nativo} nativos · {originCounts.candidato} candidatos · {originCounts.coordenador} coordenadores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-background hover:bg-accent text-foreground transition-colors"
          >
            <Upload className="w-4 h-4" /> Importar Excel
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Plus className="w-4 h-4" /> Novo Ativo
          </button>
        </div>
      </div>

      <ImportAssetsDialog open={showImport} onClose={() => setShowImport(false)} />

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
        <select value={macroFilter} onChange={e => { setMacroFilter(e.target.value); setCityFilter('all'); }} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todas as regiões</option>
          {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[220px]">
          <option value="all">Todas as cidades{macroFilter !== 'all' ? ' da região' : ''}</option>
          {cityOptions.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={alignFilter} onChange={e => setAlignFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todos os alinhamentos</option>
          {ALIGNMENT_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select value={originFilter} onChange={e => setOriginFilter(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todas as origens</option>
          <option value="nativo">Nativos</option>
          <option value="candidato">Candidatos</option>
          <option value="coordenador">Coordenadores</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todos os cargos</option>
          {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Apelido</label>
                <input value={form.nickname} onChange={e => updateForm('nickname', e.target.value)} placeholder="Ex: Zé da Padaria, Doutor, Tia Ruth" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
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
                <label className="text-xs text-muted-foreground block mb-1">Indicado por</label>
                <input value={form.referred_by} onChange={e => updateForm('referred_by', e.target.value)} placeholder="Nome de quem indicou esta pessoa" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
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
                    {asset.origin === 'nativo' ? (
                      <>
                        <button onClick={() => openEdit(asset)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(asset.source_id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <Link to={asset.source_route} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title={`Editar em ${asset.source_label}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <div className="flex items-start justify-between mb-3 pr-16">
                    <div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {asset.name}
                        {asset.readonly && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      {asset.nickname && (
                        <div className="text-[11px] font-medium text-primary">“{asset.nickname}”</div>
                      )}
                      <div className="text-xs text-muted-foreground">{asset.position || UNIFIED_TYPE_LABELS[asset.type]}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0" style={{ color: ac, borderColor: `${ac}40`, backgroundColor: `${ac}15` }}>
                      {ALIGNMENT_LABELS[asset.alignment_status] ?? asset.alignment_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{UNIFIED_TYPE_LABELS[asset.type] ?? asset.type}</span>
                    {asset.municipality && (
                      <span className="text-[10px] text-muted-foreground">{asset.municipality}</span>
                    )}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: ORIGIN_BADGE_COLORS[asset.origin],
                        borderColor: `${ORIGIN_BADGE_COLORS[asset.origin]}40`,
                        backgroundColor: `${ORIGIN_BADGE_COLORS[asset.origin]}12`,
                      }}
                    >
                      {asset.source_label}
                    </span>
                    {asset.origin === 'nativo' && assetLinks
                      .filter(l => l.asset_id === asset.source_id)
                      .map(l => {
                        const prof = leadershipProfiles.find(p => p.id === l.profile_id);
                        if (!prof) return null;
                        return (
                          <span key={l.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border" style={{ color: prof.color, borderColor: `${prof.color}40`, backgroundColor: `${prof.color}12` }}>
                            {prof.name}
                          </span>
                        );
                      })}
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
                  {(() => {
                    const rxCount = reportsByAsset.get(assetKeyFor(asset.name, asset.municipality)) ?? 0;
                    return (
                      <div className="mt-3 flex flex-col gap-2">
                        <button
                          onClick={() => setProfileAsset(asset)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60 transition-all"
                          title="Ver todos os dados deste ativo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Perfil
                          {rxCount > 0 && (
                            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/15 border border-destructive/30 text-destructive text-[9px] font-bold">
                              <FileText className="w-2.5 h-2.5" /> {rxCount}
                            </span>
                          )}
                        </button>
                        {canRaioX && (
                          <button
                            onClick={() => handleRaioX(asset)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/60 transition-all"
                            title="Iniciar investigação de due diligence"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Fazer RAIO-X
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {raioXAsset && (
        <RaioXModal
          open={!!raioXAsset}
          ativo={{
            name: raioXAsset.name,
            municipality: raioXAsset.municipality ?? '',
            position: raioXAsset.position ?? '',
            party: '',
          }}
          onClose={() => setRaioXAsset(null)}
          onConfirm={(dados) => {
            const asset = raioXAsset;
            setRaioXAsset(null);
            const sid = openRaioX(dados);
            if (asset) sessionMap.current.set(sid, asset);
          }}
        />
      )}

      {profileAsset && (
        <AssetProfileSheet
          asset={profileAsset}
          onClose={() => setProfileAsset(null)}
          canRaioX={canRaioX}
          onStartRaioX={(a) => {
            setProfileAsset(null);
            handleRaioX(a);
          }}
          rawAssetExtras={
            profileAsset.origin === 'nativo'
              ? (() => {
                  const raw = rawAssets.find(r => r.id === profileAsset.source_id);
                  return raw
                    ? { relationship_owner: raw.relationship_owner, referred_by: (raw as any).referred_by }
                    : null;
                })()
              : null
          }
        />
      )}

      <RaioXReviewDialog
        pending={pendingReview}
        onClose={() => setPendingReview(null)}
        onConfirm={confirmSaveReport}
        onRedo={redoAnalysis}
        saving={createReport.isPending}
      />
    </div>
  );
}
