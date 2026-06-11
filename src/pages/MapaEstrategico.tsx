import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Map, Filter, X, Users } from 'lucide-react';
import { municipalities, getEngagementColor } from '@/data/mockData';
import { useGeoLeads } from '@/hooks/useGeoLeads';
import { LeadsLayer, LeadsLegend } from '@/components/maps/LeadsLayer';
import MapZoomControl from '@/components/maps/MapZoomControl';
import { SOURCE_META, type GeoSource } from '@/lib/geo';

export default function MapaEstrategico() {
  const [showFilters, setShowFilters] = useState(true);
  const [showEngagement, setShowEngagement] = useState(false);
  const [activeSources, setActiveSources] = useState<Record<GeoSource, boolean>>({
    leaders: true, assets: true, members: true, actions: true, interviews: false, alerts: false,
  });

  const { data: leads = [], isLoading } = useGeoLeads(activeSources);

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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-accent transition-colors"
        >
          <Filter className="w-4 h-4" />
          Camadas
        </button>
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

            <div className="pt-3 border-t border-border">
              <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEngagement}
                  onChange={() => setShowEngagement(v => !v)}
                  className="accent-primary"
                />
                Mostrar engajamento territorial (municípios)
              </label>
            </div>

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
        <div className="flex-1 relative">
          <MapContainer
            center={[-24.7, -51.5]}
            zoom={7}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
            />

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

            <LeadsLayer leads={filteredLeads} />
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
