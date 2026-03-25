import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Map, Filter, X } from 'lucide-react';
import { municipalities, politicalAssets, getEngagementColor, getStatusColor, getStatusLabel } from '@/data/mockData';
import { useActions } from '@/hooks/useActions';

export default function MapaEstrategico() {
  const { data: actions = [] } = useActions();
  const newActionIds = new Set<string>();
  const [activeLayer, setActiveLayer] = useState<'engajamento' | 'acoes' | 'ativos' | 'pesquisas'>('acoes');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const filteredActions = actions.filter(a => statusFilter === 'all' || a.status === statusFilter);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Map className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Mapa Estratégico</h1>
            <p className="text-xs text-muted-foreground">Visualização geográfica de campo — Paraná 2026</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-accent transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      <div className="flex relative" style={{ height: 'calc(100vh - 110px)' }}>
        {/* Filters Panel */}
        {showFilters && (
          <div className="w-64 border-r border-border p-4 space-y-4 flex-shrink-0 overflow-auto" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Filtros</span>
              <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Camada Visual</label>
              <div className="space-y-1">
                {[
                  { id: 'acoes', label: 'Ações de Campo' },
                  { id: 'engajamento', label: 'Engajamento Territorial' },
                  { id: 'ativos', label: 'Ativos Políticos' },
                  { id: 'pesquisas', label: 'Pesquisas Eleitorais' },
                ].map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id as any)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${activeLayer === layer.id ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>

            {activeLayer === 'acoes' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Status da Ação</label>
                <div className="space-y-1">
                  {['all', 'prevista', 'confirmada', 'em_andamento', 'realizada', 'atrasada'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${statusFilter === s ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      {s !== 'all' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(s as any) }} />}
                      {s === 'all' ? 'Todos os status' : getStatusLabel(s as any)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2">Exibindo no mapa</div>
              <div className="text-2xl font-black text-foreground">
                {activeLayer === 'acoes' ? filteredActions.length : activeLayer === 'ativos' ? politicalAssets.length : municipalities.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeLayer === 'acoes' ? 'ações' : activeLayer === 'ativos' ? 'ativos' : 'municípios'}
              </div>
              {newActionIds.size > 0 && activeLayer === 'acoes' && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brand-green">
                  <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  {newActionIds.size} nova{newActionIds.size > 1 ? 's' : ''} ação{newActionIds.size > 1 ? 'ões' : ''} ao vivo
                </div>
              )}
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

            {/* Engajamento layer */}
            {activeLayer === 'engajamento' && municipalities.map(m => (
              <CircleMarker
                key={m.id}
                center={[m.lat, m.lng]}
                radius={Math.max(14, m.engagementScore * 0.22)}
                fillColor={getEngagementColor(m.engagementScore)}
                color={getEngagementColor(m.engagementScore)}
                weight={2}
                fillOpacity={0.8}
              >
                <Tooltip>
                  <strong>{m.name}</strong><br />
                  Score: {m.engagementScore}/100<br />
                  Coord: {m.coordinator}
                </Tooltip>
              </CircleMarker>
            ))}

            {/* Ações layer */}
            {activeLayer === 'acoes' && filteredActions.filter(a => a.lat && a.lng && !isNaN(a.lat) && !isNaN(a.lng)).map(action => {
              const isNew = newActionIds.has(action.id);
              return (
                <CircleMarker
                  key={action.id}
                  center={[action.lat, action.lng]}
                  radius={isNew ? 14 : (action.estimatedImpact > 5000 ? 16 : action.estimatedImpact > 1000 ? 12 : 8)}
                  fillColor={isNew ? '#22c55e' : getStatusColor(action.status)}
                  color={isNew ? '#ffffff' : '#ffffff'}
                  weight={isNew ? 3 : 2}
                  fillOpacity={isNew ? 1 : 0.92}
                  eventHandlers={{ click: () => setSelectedAction(action) }}
                >
                  <Popup>
                    <div style={{ color: '#1e293b', minWidth: 200 }}>
                      {isNew && <div style={{ color: '#16a34a', fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🟢 NOVA AÇÃO — AO VIVO</div>}
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{action.title}</div>
                      <div style={{ fontSize: 12 }}>📍 {action.municipality}</div>
                      <div style={{ fontSize: 12 }}>📅 {action.plannedDate} às {action.plannedTime}</div>
                      <div style={{ fontSize: 12 }}>👤 {action.responsible}</div>
                      <div style={{ fontSize: 12 }}>🎯 ~{action.estimatedImpact.toLocaleString()} impactados</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <span style={{ backgroundColor: getStatusColor(action.status), color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                          {getStatusLabel(action.status)}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Ativos layer */}
            {activeLayer === 'ativos' && politicalAssets.filter(a => a.lat).map(asset => (
              <CircleMarker
                key={asset.id}
                center={[asset.lat!, asset.lng!]}
                radius={asset.influenceLevel}
                fillColor={
                  asset.alignmentStatus === 'alinhado' ? '#22c55e' :
                  asset.alignmentStatus === 'provavel' ? '#3b82f6' :
                  asset.alignmentStatus === 'neutro' ? '#f59e0b' : '#ef4444'
                }
                color="#ffffff"
                weight={1.5}
                fillOpacity={0.85}
              >
                <Tooltip>
                  <strong>{asset.name}</strong><br />
                  {asset.position}<br />
                  Influência: {asset.influenceLevel}/10<br />
                  Status: {asset.alignmentStatus}
                </Tooltip>
              </CircleMarker>
            ))}

            {/* Pesquisas layer */}
            {activeLayer === 'pesquisas' && municipalities.filter(m => m.pollScore).map(m => (
              <CircleMarker
                key={m.id}
                center={[m.lat, m.lng]}
                radius={Math.max(8, 18)}
                fillColor={m.pollScore! > 45 ? '#22c55e' : m.pollScore! > 40 ? '#f59e0b' : '#ef4444'}
                color="#ffffff"
                weight={1}
                fillOpacity={0.7}
              >
                <Tooltip permanent={false}>
                  <strong>{m.name}</strong><br />
                  Intenção: {m.pollScore}%
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-border px-3 py-2" style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(8px)' }}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {activeLayer === 'acoes' ? 'Status das Ações' : activeLayer === 'engajamento' ? 'Índice de Engajamento' : activeLayer === 'ativos' ? 'Alinhamento' : 'Intenção de Voto'}
            </div>
            {activeLayer === 'acoes' && (
              <div className="space-y-1">
                {[
                  { color: '#22c55e', label: 'Realizada' },
                  { color: '#3b82f6', label: 'Prevista' },
                  { color: '#f59e0b', label: 'Em Andamento' },
                  { color: '#ef4444', label: 'Atrasada' },
                  { color: '#818cf8', label: 'Confirmada' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] text-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            )}
            {activeLayer === 'engajamento' && (
              <div className="space-y-1">
                {[
                  { color: '#22c55e', label: 'Consolidado (81-100)' },
                  { color: '#3b82f6', label: 'Competitivo (61-80)' },
                  { color: '#f59e0b', label: 'Atenção (31-60)' },
                  { color: '#ef4444', label: 'Risco (0-30)' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] text-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
