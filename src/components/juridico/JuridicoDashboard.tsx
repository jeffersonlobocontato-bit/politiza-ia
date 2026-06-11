import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapZoomControl from '@/components/maps/MapZoomControl';
import {
  ShieldAlert, AlertTriangle, FileCheck2, Archive, MapPinned, UserCheck, Clock,
  Maximize2, Minimize2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useMunicipalityAssociationMap } from '@/hooks/useMunicipalityAssociation';

function InvalidateOnResize({ trigger }: { trigger: any }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

type Status = 'nova' | 'em_analise' | 'protocolada' | 'arquivada';

interface ReportLite {
  id: string;
  title: string;
  status: Status;
  severity: string;
  municipality: string | null;
  lat: number | null;
  lng: number | null;
  assigned_lawyer_id: string | null;
  created_at: string;
  ai_risk_score: number | null;
}

const SEV_COLOR: Record<string, string> = {
  critica: '#ef4444',
  alta: '#f97316',
  media: '#f59e0b',
  baixa: '#10b981',
};

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 0 0 2px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.35);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const PR_CENTER: [number, number] = [-24.6, -51.4];

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function colorForAssoc(acronym: string): string {
  if (!acronym) return 'hsl(220 10% 35%)';
  let h = 0;
  for (let i = 0; i < acronym.length; i++) h = (h * 31 + acronym.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 60% 55%)`;
}

function useIbgeMunicipios() {
  return useQuery({
    queryKey: ['ibge-municipios-pr'],
    queryFn: async () => {
      const r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios');
      const arr = await r.json() as { id: number; nome: string }[];
      const map = new Map<string, string>();
      arr.forEach(m => map.set(String(m.id), m.nome));
      return map;
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

function usePrGeoJson() {
  return useQuery({
    queryKey: ['ibge-malha-pr-municipios'],
    queryFn: async () => {
      const r = await fetch(
        'https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio',
      );
      return await r.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

function AssociationsLayer({
  geo, featureInfo,
}: {
  geo: any;
  featureInfo: (codarea: string) => { name: string; acronym: string | null; assocName: string | null; color: string };
}) {
  return (
    <GeoJSON
      data={geo}
      style={(f: any) => {
        const info = featureInfo(String(f?.properties?.codarea ?? ''));
        return {
          fillColor: info.color,
          fillOpacity: 0.45,
          color: '#0f172a',
          weight: 0.5,
        };
      }}
      onEachFeature={(feature: any, layer: any) => {
        const info = featureInfo(String(feature?.properties?.codarea ?? ''));
        layer.bindTooltip(
          `<div style="font-size:11px"><strong>${info.name}</strong><br/>${
            info.acronym ? `${info.acronym} — ${info.assocName}` : 'Sem associação'
          }</div>`,
          { sticky: true },
        );
        layer.on({
          mouseover: (e: any) => e.target.setStyle({ weight: 1.5, fillOpacity: 0.65 }),
          mouseout: (e: any) => e.target.setStyle({ weight: 0.5, fillOpacity: 0.45 }),
        });
      }}
    />
  );
}

export function JuridicoDashboard({
  reports, onPick,
}: { reports: ReportLite[]; onPick: (id: string) => void }) {
  const kpis = useMemo(() => {
    const total = reports.length;
    const novas = reports.filter(r => r.status === 'nova').length;
    const emAnalise = reports.filter(r => r.status === 'em_analise').length;
    const protocoladas = reports.filter(r => r.status === 'protocolada').length;
    const arquivadas = reports.filter(r => r.status === 'arquivada').length;
    const criticas = reports.filter(r => r.severity === 'critica' || r.severity === 'alta').length;
    const semResp = reports.filter(r => !r.assigned_lawyer_id && r.status !== 'arquivada').length;
    const geocod = reports.filter(r => r.lat != null && r.lng != null).length;
    return { total, novas, emAnalise, protocoladas, arquivadas, criticas, semResp, geocod };
  }, [reports]);

  const pinned = reports.filter(r => r.lat != null && r.lng != null);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [expanded]);

  const { data: assocMap } = useMunicipalityAssociationMap();
  const { data: ibgeNames } = useIbgeMunicipios();
  const { data: geo } = usePrGeoJson();

  const featureInfo = useMemo(() => {
    return (codarea: string) => {
      const name = ibgeNames?.get(codarea) ?? codarea;
      const assoc = assocMap?.get(normalize(name));
      if (!assoc) return { name, acronym: null, assocName: null, color: 'hsl(220 10% 35%)' };
      return { name, acronym: assoc.acronym, assocName: assoc.name, color: colorForAssoc(assoc.acronym) };
    };
  }, [assocMap, ibgeNames]);

  const legend = useMemo(() => {
    if (!assocMap) return [];
    const seen = new Map<string, string>();
    assocMap.forEach(a => seen.set(a.acronym, a.name));
    return Array.from(seen.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([acronym, name]) => ({ acronym, name, color: colorForAssoc(acronym) }));
  }, [assocMap]);

  const hotspots = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach(r => {
      if (!r.municipality) return;
      map.set(r.municipality, (map.get(r.municipality) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [reports]);

  const renderMapContents = (onPinClick: (id: string) => void) => (
    <>
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {geo && ibgeNames && assocMap && (
        <AssociationsLayer geo={geo} featureInfo={featureInfo} />
      )}
      {pinned.map(r => (
        <Marker key={r.id} position={[r.lat!, r.lng!]}
          icon={pinIcon(SEV_COLOR[r.severity] ?? '#94a3b8')}
          eventHandlers={{ click: () => onPinClick(r.id) }}>
          <Tooltip direction="top">
            <div className="text-xs">
              <div className="font-semibold">{r.title}</div>
              <div className="text-muted-foreground">{r.municipality ?? '—'} · {r.severity}</div>
              <div className="text-[10px] italic">clique para abrir</div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );

  return (
    <div className="border-b border-border bg-muted/20 p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Kpi icon={ShieldAlert} label="Total" value={kpis.total} tone="primary" />
        <Kpi icon={AlertTriangle} label="Novas" value={kpis.novas} tone="destructive" />
        <Kpi icon={Clock} label="Em análise" value={kpis.emAnalise} tone="amber" />
        <Kpi icon={FileCheck2} label="Protocoladas" value={kpis.protocoladas} tone="primary" />
        <Kpi icon={Archive} label="Arquivadas" value={kpis.arquivadas} tone="muted" />
        <Kpi icon={ShieldAlert} label="Alta/Crítica" value={kpis.criticas} tone="destructive" />
        <Kpi icon={UserCheck} label="Sem responsável" value={kpis.semResp} tone="amber" />
      </div>

      {/* Mapa + hotspots */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Mapa de denúncias</h3>
            <span className="text-[10px] text-muted-foreground">
              {pinned.length} de {kpis.total} com geolocalização · regiões coloridas por associação
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(true)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Expandir mapa">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCollapsed(c => !c)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={collapsed ? 'Mostrar mapa' : 'Recolher mapa'}>
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden relative isolate" style={{ height: 360, zIndex: 0 }}>
              <MapContainer center={PR_CENTER} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false}>
                <InvalidateOnResize trigger={`inline-${collapsed}-${expanded}-${!!geo}`} />
                {renderMapContents(onPick)}
                <MapZoomControl />
              </MapContainer>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <MapPinned className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Hotspots</h3>
              </div>
              {hotspots.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-4 text-center">Sem dados</p>
              ) : (
                <ul className="space-y-1.5">
                  {hotspots.map(([city, n]) => (
                    <li key={city} className="flex items-center justify-between text-xs">
                      <span className="text-foreground truncate">{city}</span>
                      <span className="font-bold text-destructive">{n}</span>
                    </li>
                  ))}
                </ul>
              )}

              {legend.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Associações
                  </div>
                  <div className="max-h-40 overflow-y-auto pr-1 space-y-1">
                    {legend.map(l => (
                      <div key={l.acronym} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                        <span className="font-semibold text-foreground">{l.acronym}</span>
                        <span className="text-muted-foreground truncate">{l.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
                {kpis.geocod} de {kpis.total} denúncias com geolocalização
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {expanded && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPinned className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Mapa de denúncias — visão expandida</h3>
              <span className="text-[10px] text-muted-foreground">{pinned.length} pins · {legend.length} associações</span>
            </div>
            <button onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs">
              <Minimize2 className="w-3.5 h-3.5" /> Fechar
            </button>
          </div>
          <div className="flex-1 relative isolate" style={{ zIndex: 0 }}>
            <MapContainer center={PR_CENTER} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false}>
              <InvalidateOnResize trigger={`full-${expanded}-${!!geo}`} />
              {renderMapContents((id) => { onPick(id); setExpanded(false); })}
              <MapZoomControl />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number; tone: 'primary' | 'destructive' | 'amber' | 'muted' }) {
  const toneCls = {
    primary: 'text-primary border-primary/30 bg-primary/5',
    destructive: 'text-destructive border-destructive/30 bg-destructive/5',
    amber: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
    muted: 'text-muted-foreground border-border bg-muted/30',
  }[tone];
  return (
    <div className={`rounded-xl border ${toneCls} p-3 flex items-center gap-3`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
