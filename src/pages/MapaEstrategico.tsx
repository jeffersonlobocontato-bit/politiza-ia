import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Map, Filter, X, Users, FileText, Printer } from 'lucide-react';
import { municipalities, getEngagementColor } from '@/data/mockData';
import { useGeoLeads } from '@/hooks/useGeoLeads';
import { LeadsLayer, LeadsLegend } from '@/components/maps/LeadsLayer';
import MapZoomControl from '@/components/maps/MapZoomControl';
import { SOURCE_META, type GeoSource } from '@/lib/geo';
import { PrAssociationChoropleth, PrAssociationLegend } from '@/components/maps/PrAssociationChoropleth';
import { useEmendas } from '@/hooks/useEmendas';
import { FAIXAS, getFaixaByValor } from '@/lib/emendas';
import { typeMeta, geoLeadType, FAMILY_META, type AssetFamily } from '@/lib/assetColors';

type BgMode = 'colored' | 'outline' | 'hidden';

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function MapaEstrategico() {
  const [showFilters, setShowFilters] = useState(true);
  const [showEngagement, setShowEngagement] = useState(false);
  const [showEmendas, setShowEmendas] = useState(false);
  const [activeSources, setActiveSources] = useState<Record<GeoSource, boolean>>({
    leaders: true, assets: true, members: true, actions: true, interviews: false, alerts: false, candidates: true,
  });
  const [bgMode, setBgMode] = useState<BgMode>('hidden');
  const [hiddenFamilies, setHiddenFamilies] = useState<Set<AssetFamily>>(new Set());
  const toggleFamily = (f: AssetFamily) =>
    setHiddenFamilies(prev => {
      const n = new Set(prev);
      n.has(f) ? n.delete(f) : n.add(f);
      return n;
    });

  const { data: leads = [], isLoading } = useGeoLeads(activeSources);
  const { data: emendas = [] } = useEmendas();
  const geoEmendas = useMemo(
    () => emendas.filter(e => e.lat && e.lng),
    [emendas]
  );


  const bgOptions: { id: BgMode; label: string }[] = [
    { id: 'colored', label: 'Cores' },
    { id: 'outline', label: 'Contornos' },
    { id: 'hidden', label: 'Oculto' },
  ];

  const counts = useMemo(() => {
    const c: Partial<Record<GeoSource, number>> = {};
    for (const l of leads) c[l.source] = (c[l.source] ?? 0) + 1;
    return c;
  }, [leads]);

  const filteredLeads = useMemo(
    () => leads.filter(l => activeSources[l.source]),
    [leads, activeSources]
  );

  const toggleSource = (s: string) =>
    setActiveSources(prev => ({ ...prev, [s]: !prev[s as GeoSource] }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Map className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Mapa Estratégico</h1>
            <p className="text-xs text-muted-foreground">
              Visualização geográfica de todos os cadastros — Paraná 2026
              {isLoading && <span className="ml-2 text-primary">• carregando…</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/mapa/imprimir"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Printer className="w-4 h-4" />
            Imprimir mapa
          </Link>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Filter className="w-4 h-4" />
            Camadas
          </button>
        </div>
      </div>

      <div className="flex relative" style={{ height: 'calc(100vh - 110px)' }}>
        {/* Filters Panel */}
        {showFilters && (
          <div className="w-72 border-r border-border p-4 space-y-4 flex-shrink-0 overflow-auto" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Camadas de Leads
              </span>
              <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <LeadsLegend active={activeSources} counts={counts} onToggle={toggleSource} />

            <div className="pt-3 border-t border-border space-y-2">
              <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEngagement}
                  onChange={() => setShowEngagement(v => !v)}
                  className="accent-primary"
                />
                Mostrar engajamento territorial (municípios)
              </label>
              <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmendas}
                  onChange={() => setShowEmendas(v => !v)}
                  className="accent-primary"
                />
                <FileText className="w-3 h-3 text-primary" />
                Emendas parlamentares
                {geoEmendas.length > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                    {geoEmendas.length}
                  </span>
                )}
              </label>
              {showEmendas && (
                <div className="pl-5 grid grid-cols-1 gap-0.5 mt-1">
                  {FAIXAS.map(f => (
                    <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                      <span className="text-muted-foreground truncate">{f.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Camada de fundo</p>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-muted/30 border border-border">
                {bgOptions.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setBgMode(o.id)}
                    className={`text-[10px] py-1.5 rounded font-medium transition-colors ${
                      bgMode === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
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

            <div className="pt-3 border-t border-border">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total exibido</div>
              <div className="text-2xl font-black text-foreground tabular-nums">{filteredLeads.length}</div>
              <div className="text-[10px] text-muted-foreground">cadastros georreferenciados</div>
              <div className="mt-2 text-[10px] text-muted-foreground leading-snug">
                Pontos com borda tracejada são <strong className="text-foreground">aproximados</strong>
                — usaram o centróide da cidade ou da macrorregião quando o GPS não estava cadastrado.
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative" style={{ background: bgMode === 'outline' ? '#ffffff' : undefined }}>
          <MapContainer
            center={[-24.7, -51.5]}
            zoom={7}
            style={{ height: '100%', width: '100%', background: bgMode === 'outline' ? '#ffffff' : undefined }}
            zoomControl={false}
          >
            {bgMode !== 'outline' && (
              <TileLayer
                url={bgMode === 'colored'
                  ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                opacity={bgMode === 'colored' ? 0.35 : 1}
              />
            )}

            {bgMode === 'colored' && <PrAssociationChoropleth />}
            {bgMode === 'outline' && (
              <PrAssociationChoropleth fillOpacity={0} strokeColor="#94a3b8" strokeWeight={0.5} />
            )}

            {showEngagement && municipalities.map(m => (
              <CircleMarker
                key={m.id}
                center={[m.lat, m.lng]}
                radius={Math.max(10, m.engagementScore * 0.18)}
                fillColor={getEngagementColor(m.engagementScore)}
                color={getEngagementColor(m.engagementScore)}
                weight={1}
                fillOpacity={0.18}
              >
                <Tooltip>
                  <strong>{m.name}</strong><br />
                  Engajamento: {m.engagementScore}/100
                </Tooltip>
              </CircleMarker>
            ))}

            {showEmendas && geoEmendas.map(e => {
              const faixa = getFaixaByValor(e.valor_total);
              return (
                <CircleMarker
                  key={`em-${e.id}`}
                  center={[e.lat!, e.lng!]}
                  radius={faixa.id === 'f7_estrategica' ? 12 : faixa.id === 'f6_muito_alta' ? 10 : faixa.id === 'f5_alta' ? 8 : 6}
                  fillColor={faixa.color}
                  color={bgMode === 'outline' ? '#1a2a45' : '#ffffff'}
                  weight={1.5}
                  fillOpacity={0.88}
                >
                  <Popup>
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: faixa.color, fontWeight: 700 }}>
                        Emenda · {faixa.label}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{e.ente_federativo}</div>
                      {e.unidade_beneficiaria && (
                        <div style={{ fontSize: 11, marginTop: 1 }}>{e.unidade_beneficiaria}</div>
                      )}
                      {e.area_tematica && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>📋 {e.area_tematica}</div>
                      )}
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: faixa.color }}>
                        {fmtBRL(e.valor_total)}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Exercício {e.exercicio}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            <LeadsLayer leads={filteredLeads} />
            <MapZoomControl />
          </MapContainer>

          {/* Mini-legenda fixa */}
          <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-border px-3 py-2" style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(8px)' }}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipos de Cadastro</div>
            <div className="space-y-1">
              {(Object.keys(SOURCE_META) as GeoSource[])
                .filter(k => activeSources[k] && (counts[k] ?? 0) > 0)
                .map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_META[k].color }} />
                    <span className="text-[10px] text-foreground">{SOURCE_META[k].label}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{counts[k]}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
