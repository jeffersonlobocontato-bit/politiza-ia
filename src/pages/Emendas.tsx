// src/pages/Emendas.tsx
import { useState, useMemo, useRef } from 'react';
import {
  FileText, LayoutDashboard, Map, Table2, Plus, Upload, Download,
  Search, Filter, X, Loader2, CheckCircle2, AlertCircle, Edit2, Trash2,
  ChevronDown, TrendingUp, Banknote, BarChart3, Target, AlertTriangle,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import MapZoomControl from '@/components/maps/MapZoomControl';
import { PrAssociationChoropleth, PrAssociationLegend } from '@/components/maps/PrAssociationChoropleth';
import { useCandidate } from '@/contexts/CandidateContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEmendas, useCreateEmenda, useUpdateEmenda, useDeleteEmenda,
  useImportEmendas, type Emenda, type EmendaInput,
} from '@/hooks/useEmendas';
import {
  FAIXAS, STATUS_CONFIG, STATUS_OPTIONS, TIPO_LABELS, AREAS_TEMATICAS,
  AREA_COLORS, getFaixaByValor, fmtBRL, fmtBRLFull,
  type EmendaStatus, type EmendaTipo, type EmendaFaixa,
} from '@/lib/emendas';
import { tooltipStyle, GRID_STROKE, AXIS_TICK_LIGHT } from '@/components/ui/DashboardCards';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FaixaBadge({ valor }: { valor: number }) {
  const f = getFaixaByValor(valor);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: f.colorLight, color: f.colorText, borderColor: f.color + '66' }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: f.color }} />
      {f.labelCurto}
    </span>
  );
}

function StatusBadge({ status }: { status: EmendaStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: s.colorLight, color: s.colorText, borderColor: s.color + '66' }}
    >
      {s.label}
    </span>
  );
}

const EMPTY_FORM = (): EmendaInput => ({
  exercicio:            new Date().getFullYear(),
  tipo:                 'individual',
  numero_emenda:        null,
  orgao_gestor:         null,
  area_tematica:        null,
  acao_orcamentaria:    null,
  ente_federativo:      '',
  unidade_beneficiaria: null,
  municipio:            null,
  macroregion_id:       null,
  finalidade:           null,
  valor_total:          0,
  valor_custeio:        0,
  valor_investimento:   0,
  valor_empenhado:      0,
  valor_pago:           0,
  instrumento_repasse:  null,
  numero_empenho:       null,
  data_empenho:         null,
  numero_ordem_bancaria:null,
  data_pagamento:       null,
  status_raw:           null,
  status:               'sem_processo',
  lat:                  null,
  lng:                  null,
  observacoes_internas: null,
});

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="absolute top-3 right-3 opacity-20">
        <Icon className="w-8 h-8" style={{ color: accent }} />
      </div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}

// ─── Legenda de faixas ────────────────────────────────────────────────────────

function FaixaLegend({ active, onToggle }: {
  active: Set<EmendaFaixa>;
  onToggle: (id: EmendaFaixa) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Faixas de Valor</p>
      {FAIXAS.map(f => (
        <button
          key={f.id}
          onClick={() => onToggle(f.id)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-opacity ${
            active.has(f.id) ? 'opacity-100' : 'opacity-35'
          }`}
        >
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: f.color }} />
          <span className="text-foreground truncate">{f.labelCurto}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ emendas }: { emendas: Emenda[] }) {
  const [citySearch, setCitySearch] = useState('');

  const filteredByCity = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return emendas;
    return emendas.filter(e =>
      (e.municipio ?? '').toLowerCase().includes(q) ||
      e.ente_federativo.toLowerCase().includes(q)
    );
  }, [emendas, citySearch]);

  const cidadesAtendidas = useMemo(() => {
    const s = new Set<string>();
    filteredByCity.forEach(e => {
      const c = (e.municipio ?? e.ente_federativo ?? '').trim();
      if (c) s.add(c.toLowerCase());
    });
    return s.size;
  }, [filteredByCity]);

  const cidadeSuggestions = useMemo(() => {
    const s = new Set<string>();
    emendas.forEach(e => { if (e.municipio) s.add(e.municipio); });
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [emendas]);

  const dataSet = filteredByCity;

  const semCidade = useMemo(() =>
    dataSet.filter(e => !e.municipio || e.municipio.trim() === '').length,
  [dataSet]);
  const totalDestinado = dataSet.reduce((s, e) => s + e.valor_total, 0);
  const totalPago      = dataSet.reduce((s, e) => s + e.valor_pago, 0);
  const totalEmpenhado = dataSet.reduce((s, e) => s + e.valor_empenhado, 0);
  const pctExecucao    = totalDestinado > 0 ? Math.round((totalPago / totalDestinado) * 100) : 0;

  // Por área
  const porArea = useMemo(() => {
    const m: Record<string, { valor: number; qtd: number }> = {};
    dataSet.forEach(e => {
      const a = e.area_tematica ?? 'Outras';
      if (!m[a]) m[a] = { valor: 0, qtd: 0 };
      m[a].valor += e.valor_total;
      m[a].qtd += 1;
    });
    return Object.entries(m)
      .map(([area, d]) => ({ area, valor: d.valor, qtd: d.qtd }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [dataSet]);

  // Por exercício
  const porExercicio = useMemo(() => {
    const m: Record<number, { destinado: number; pago: number }> = {};
    dataSet.forEach(e => {
      if (!m[e.exercicio]) m[e.exercicio] = { destinado: 0, pago: 0 };
      m[e.exercicio].destinado += e.valor_total;
      m[e.exercicio].pago      += e.valor_pago;
    });
    return Object.entries(m)
      .map(([ano, d]) => ({ ano, ...d }))
      .sort((a, b) => Number(a.ano) - Number(b.ano));
  }, [dataSet]);

  // Por faixa (pizza)
  const porFaixa = useMemo(() => {
    const m: Record<string, number> = {};
    dataSet.forEach(e => { m[e.faixa_valor] = (m[e.faixa_valor] ?? 0) + 1; });
    return FAIXAS.map(f => ({ name: f.labelCurto, value: m[f.id] ?? 0, color: f.color }))
      .filter(f => f.value > 0);
  }, [dataSet]);

  // Por status
  const porStatus = useMemo(() => {
    const m: Record<string, number> = {};
    dataSet.forEach(e => { m[e.status] = (m[e.status] ?? 0) + 1; });
    return STATUS_OPTIONS.map(s => ({ name: s.label, value: m[s.id] ?? 0, color: s.color }))
      .filter(s => s.value > 0);
  }, [dataSet]);

  return (
    <div className="space-y-5">
      {/* Busca por cidade */}
      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              list="emendas-cidades-list"
              className="w-full bg-background border border-border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Buscar cidade no painel…"
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
            />
            {citySearch && (
              <button
                onClick={() => setCitySearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <datalist id="emendas-cidades-list">
              {cidadeSuggestions.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <span className="text-xs text-muted-foreground">
            {citySearch
              ? <>Mostrando {dataSet.length} emenda(s) em {cidadesAtendidas} cidade(s)</>
              : <>{cidadeSuggestions.length} município(s) com emendas cadastradas</>}
          </span>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <KpiCard icon={Banknote}      label="Total destinado"     value={fmtBRL(totalDestinado)}   sub={`${dataSet.length} emendas`}       accent="#378ADD" />
        <KpiCard icon={TrendingUp}    label="Total pago"          value={fmtBRL(totalPago)}        sub={`${pctExecucao}% do destinado`}    accent="#1D9E75" />
        <KpiCard icon={Target}        label="Empenhado"           value={fmtBRL(totalEmpenhado)}   sub="valor com empenho"                 accent="#7F77DD" />
        <KpiCard icon={BarChart3}     label="Taxa de execução"    value={`${pctExecucao}%`}        sub="pago / destinado"                   accent="#BA7517" />
        <KpiCard icon={Map}           label="Cidades atendidas"   value={String(cidadesAtendidas)} sub="municípios distintos"              accent="#1A9FAA" />
        <KpiCard icon={AlertTriangle} label="Sem cidade"          value={String(semCidade)}        sub="lançadas como Paraná"              accent="#E24B4A" />
      </div>

      {/* Barra de progresso geral */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Execução geral das emendas</span>
          <span className="font-bold text-foreground text-sm">{pctExecucao}%</span>
        </div>
        <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pctExecucao}%`, background: pctExecucao >= 70 ? '#1D9E75' : pctExecucao >= 40 ? '#BA7517' : '#E24B4A' }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Por área temática */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Valor por área temática</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porArea} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtBRL(v)} tick={AXIS_TICK_LIGHT} />
              <YAxis type="category" dataKey="area" tick={{ ...AXIS_TICK_LIGHT, fontSize: 10 }} width={110} />
              <RechartsTip
                formatter={(v: number) => [fmtBRLFull(v), 'Valor']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                {porArea.map(entry => (
                  <Cell key={entry.area} fill={AREA_COLORS[entry.area] ?? '#378ADD'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por exercício */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Destinado vs Pago por exercício</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porExercicio} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="ano" tick={AXIS_TICK_LIGHT} />
              <YAxis tickFormatter={v => fmtBRL(v)} tick={AXIS_TICK_LIGHT} />
              <RechartsTip
                formatter={(v: number, name: string) => [fmtBRLFull(v), name === 'destinado' ? 'Destinado' : 'Pago']}
                contentStyle={tooltipStyle}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="destinado" name="Destinado" fill="#378ADD" radius={[4,4,0,0]} />
              <Bar dataKey="pago"      name="Pago"      fill="#1D9E75" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por faixa */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição por faixa de valor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={porFaixa} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {porFaixa.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <RechartsTip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Por status */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Situação das emendas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {porStatus.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <RechartsTip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── Map Tab ──────────────────────────────────────────────────────────────────

type BgMode = 'colored' | 'outline' | 'hidden';

function MapTab({ emendas }: { emendas: Emenda[] }) {
  const [activeFaixas, setActiveFaixas] = useState<Set<EmendaFaixa>>(
    new Set(FAIXAS.map(f => f.id))
  );
  const [activeStatuses, setActiveStatuses] = useState<Set<EmendaStatus>>(
    new Set(STATUS_OPTIONS.map(s => s.id))
  );
  const [showPanel, setShowPanel] = useState(true);
  const [bgMode, setBgMode] = useState<BgMode>('colored');

  const toggleFaixa = (id: EmendaFaixa) =>
    setActiveFaixas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleStatus = (id: EmendaStatus) =>
    setActiveStatuses(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const geoEmendas = useMemo(() =>
    emendas.filter(e => e.lat && e.lng && activeFaixas.has(e.faixa_valor) && activeStatuses.has(e.status)),
    [emendas, activeFaixas, activeStatuses]
  );

  const bgOptions: { id: BgMode; label: string }[] = [
    { id: 'colored', label: 'Cores' },
    { id: 'outline', label: 'Contornos' },
    { id: 'hidden', label: 'Oculto' },
  ];

  return (
    <div className="flex relative" style={{ height: 'calc(100vh - 180px)', minHeight: 520 }}>
      {/* Painel lateral */}
      {showPanel && (
        <div className="w-64 border-r border-border p-4 space-y-5 flex-shrink-0 overflow-auto bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Filtrar mapa</span>
            <button onClick={() => setShowPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <FaixaLegend active={activeFaixas} onToggle={toggleFaixa} />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Status</p>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => toggleStatus(s.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-opacity ${
                  activeStatuses.has(s.id) ? 'opacity-100' : 'opacity-35'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-foreground">{s.label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Camada de fundo</p>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-muted/30 border border-border">
              {bgOptions.map(o => (
                <button
                  key={o.id}
                  onClick={() => setBgMode(o.id)}
                  className={`text-[10px] py-1.5 rounded font-medium transition-colors ${
                    bgMode === o.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
              {bgMode === 'colored' && 'Municípios coloridos por associação.'}
              {bgMode === 'outline' && 'Mapa branco, apenas contornos — melhor contraste dos pins.'}
              {bgMode === 'hidden' && 'Apenas o mapa base.'}
            </p>
          </div>

          {bgMode === 'colored' && <PrAssociationLegend />}

          <div className="pt-2 border-t border-border">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Exibindo</div>
            <div className="text-2xl font-black text-foreground tabular-nums">{geoEmendas.length}</div>
            <div className="text-[10px] text-muted-foreground">emendas georreferenciadas</div>
          </div>
        </div>
      )}

      {/* Mapa */}
      <div className="flex-1 relative" style={{ background: bgMode === 'outline' ? '#ffffff' : undefined }}>
        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="absolute top-3 left-3 z-[1000] bg-card border border-border rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 shadow"
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
          </button>
        )}
        <MapContainer center={[-24.7, -51.5]} zoom={7} style={{ height: '100%', width: '100%', background: bgMode === 'outline' ? '#ffffff' : undefined }} zoomControl={false}>
          {bgMode !== 'outline' && (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              opacity={0.35}
            />
          )}
          {bgMode === 'colored' && <PrAssociationChoropleth />}
          {bgMode === 'outline' && (
            <PrAssociationChoropleth fillOpacity={0} strokeColor="#94a3b8" strokeWeight={0.5} />
          )}
          <MapZoomControl />
          {geoEmendas.map(e => {
            const faixa = getFaixaByValor(e.valor_total);
            const status = STATUS_CONFIG[e.status];
            return (
              <CircleMarker
                key={e.id}
                center={[e.lat!, e.lng!]}
                radius={faixa.id === 'f7_estrategica' ? 12 : faixa.id === 'f6_muito_alta' ? 10 : faixa.id === 'f5_alta' ? 8 : 6}
                fillColor={faixa.color}
                color={bgMode === 'outline' ? '#1a2a45' : '#ffffff'}
                weight={1.5}
                fillOpacity={0.88}
              >
                <Popup className="emenda-popup">
                  <div style={{ minWidth: 220, color: '#fff' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: faixa.color, fontWeight: 700 }}>
                      {faixa.label}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{e.ente_federativo}</div>
                    {e.unidade_beneficiaria && (
                      <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 1 }}>{e.unidade_beneficiaria}</div>
                    )}
                    {e.area_tematica && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>📋 {e.area_tematica}</div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: faixa.color }}>{fmtBRL(e.valor_total)}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                        background: status.colorLight, color: status.colorText,
                      }}>{status.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Exercício {e.exercicio}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

// ─── Table Tab ────────────────────────────────────────────────────────────────

function TableTab({ emendas, isAdmin }: { emendas: Emenda[]; isAdmin: boolean }) {
  const [search, setSearch]         = useState('');
  const [filterExercicio, setEx]    = useState<string>('all');
  const [filterArea, setArea]       = useState<string>('all');
  const [filterStatus, setSt]       = useState<string>('all');
  const [filterFaixa, setFaixa]     = useState<string>('all');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<EmendaInput>(EMPTY_FORM());
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createEmenda = useCreateEmenda();
  const updateEmenda = useUpdateEmenda();
  const deleteEmenda = useDeleteEmenda();
  const importEmendas = useImportEmendas();

  const exercicios = [...new Set(emendas.map(e => e.exercicio))].sort((a, b) => b - a);

  const filtered = useMemo(() => emendas.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      e.ente_federativo.toLowerCase().includes(q) ||
      (e.area_tematica ?? '').toLowerCase().includes(q) ||
      (e.finalidade ?? '').toLowerCase().includes(q) ||
      (e.municipio ?? '').toLowerCase().includes(q);
    return matchSearch
      && (filterExercicio === 'all' || e.exercicio === Number(filterExercicio))
      && (filterArea     === 'all' || e.area_tematica === filterArea)
      && (filterStatus   === 'all' || e.status === filterStatus)
      && (filterFaixa    === 'all' || e.faixa_valor === filterFaixa);
  }), [emendas, search, filterExercicio, filterArea, filterStatus, filterFaixa]);

  const handleSave = async () => {
    if (!form.ente_federativo.trim()) { toast.error('Ente federativo é obrigatório'); return; }
    try {
      if (editId) {
        await updateEmenda.mutateAsync({ id: editId, ...form });
        toast.success('Emenda atualizada');
      } else {
        await createEmenda.mutateAsync(form);
        toast.success('Emenda criada');
      }
      setShowForm(false); setEditId(null); setForm(EMPTY_FORM());
    } catch { toast.error('Erro ao salvar emenda'); }
  };

  const handleEdit = (e: Emenda) => {
    setEditId(e.id);
    setForm({ ...e } as EmendaInput);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta emenda?')) return;
    await deleteEmenda.mutateAsync(id);
    toast.success('Emenda removida');
  };

  const handleImportFile = async (file: File) => {
    try {
      const result = await importEmendas.mutateAsync(file);
      toast.success(`${result.inserted} emendas importadas${result.invalid > 0 ? ` (${result.invalid} ignoradas)` : ''}`);
      setShowImport(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro na importação');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar por ente, área, município…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select value={filterExercicio} onChange={e => setEx(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Todos os anos</option>
          {exercicios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterArea} onChange={e => setArea(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Todas as áreas</option>
          {AREAS_TEMATICAS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setSt(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <select value={filterFaixa} onChange={e => setFaixa(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">Todas as faixas</option>
          {FAIXAS.map(f => <option key={f.id} value={f.id}>{f.labelCurto}</option>)}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowImport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Importar xlsx
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM()); setEditId(null); setShowForm(v => !v); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova emenda
          </button>
        </div>
      </div>

      {/* Import area */}
      {showImport && (
        <Card className="p-4 border-dashed border-primary/40 bg-primary/5">
          <div className="text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">Importar planilha de emendas</p>
            <p className="text-xs text-muted-foreground mb-3">
              Aceita o formato original do Senador Moro (todas as abas serão processadas)
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importEmendas.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {importEmendas.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Importando…</span>
              ) : 'Selecionar arquivo'}
            </button>
          </div>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card className="p-4 border-primary/40 bg-primary/5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs text-muted-foreground">Ente federativo *</label>
              <input className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.ente_federativo} onChange={e => setForm(f => ({ ...f, ente_federativo: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Exercício</label>
              <input type="number" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.exercicio} onChange={e => setForm(f => ({ ...f, exercicio: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as EmendaTipo }))}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EmendaStatus }))}>
                {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Área temática</label>
              <select className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.area_tematica ?? ''} onChange={e => setForm(f => ({ ...f, area_tematica: e.target.value || null }))}>
                <option value="">— selecione —</option>
                {AREAS_TEMATICAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor total (R$)</label>
              <input type="number" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor pago (R$)</label>
              <input type="number" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.valor_pago} onChange={e => setForm(f => ({ ...f, valor_pago: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Município</label>
              <input className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.municipio ?? ''} onChange={e => setForm(f => ({ ...f, municipio: e.target.value || null }))} />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs text-muted-foreground">Finalidade / Objeto</label>
              <textarea rows={2} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                value={form.finalidade ?? ''} onChange={e => setForm(f => ({ ...f, finalidade: e.target.value || null }))} />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs text-muted-foreground">Observações internas (campanha)</label>
              <textarea rows={2} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                value={form.observacoes_internas ?? ''} onChange={e => setForm(f => ({ ...f, observacoes_internas: e.target.value || null }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={createEmenda.isPending || updateEmenda.isPending}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90">
              {editId ? 'Salvar alterações' : 'Criar emenda'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM()); }}
              className="px-4 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {/* Contagem */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} de {emendas.length} emendas
        <span className="ml-2 font-medium text-foreground">
          Total filtrado: {fmtBRL(filtered.reduce((s, e) => s + e.valor_total, 0))}
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {['Ano', 'Ente / Município', 'Área', 'Finalidade', 'Valor', 'Faixa', 'Status', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma emenda encontrada com os filtros aplicados.
                </td>
              </tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{e.exercicio}</td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <div className="font-medium text-foreground truncate">{e.ente_federativo}</div>
                  {e.municipio && <div className="text-muted-foreground truncate">{e.municipio}</div>}
                </td>
                <td className="px-3 py-2.5 max-w-[120px]">
                  {e.area_tematica && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                      background: (AREA_COLORS[e.area_tematica] ?? '#378ADD') + '22',
                      color: AREA_COLORS[e.area_tematica] ?? '#378ADD',
                    }}>{e.area_tematica}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 max-w-[200px]">
                  <span className="text-foreground line-clamp-2">{e.finalidade ?? '—'}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="font-semibold text-foreground">{fmtBRL(e.valor_total)}</div>
                  {e.valor_pago > 0 && (
                    <div className="text-[10px] text-muted-foreground">pago: {fmtBRL(e.valor_pago)}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap"><FaixaBadge valor={e.valor_total} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(e)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(e.id)}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Emendas() {
  const { isAdmin } = useAuth();
  const { data: emendas = [], isLoading } = useEmendas();

  const totalDestinado = emendas.reduce((s, e) => s + e.valor_total, 0);
  const geoCount = emendas.filter(e => e.lat && e.lng).length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Emendas Parlamentares</h1>
          <p className="text-xs text-muted-foreground">
            Senador Sergio Moro · LOA 2024–2026 · {emendas.length} registros · {fmtBRL(totalDestinado)} destinados
          </p>
        </div>
        {isLoading && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando…
          </div>
        )}
        {!isLoading && geoCount < emendas.length && (
          <div className="ml-auto text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
            {emendas.length - geoCount} sem coordenadas no mapa
          </div>
        )}
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="bg-muted/20">
          <TabsTrigger value="dashboard" className="text-xs gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Painel
          </TabsTrigger>
          <TabsTrigger value="mapa" className="text-xs gap-1.5">
            <Map className="w-3.5 h-3.5" /> Mapa do Paraná
          </TabsTrigger>
          <TabsTrigger value="lista" className="text-xs gap-1.5">
            <Table2 className="w-3.5 h-3.5" /> Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 max-w-7xl mx-auto">
          <DashboardTab emendas={emendas} />
        </TabsContent>
        <TabsContent value="mapa" className="mt-4 -mx-4 md:-mx-6">
          <MapTab emendas={emendas} />
        </TabsContent>
        <TabsContent value="lista" className="mt-4 max-w-7xl mx-auto">
          <TableTab emendas={emendas} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
