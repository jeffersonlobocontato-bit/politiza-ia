import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle, GeoJSON, Pane } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { resolveGeo } from '@/lib/geo';
import type { SlateCandidate, SlateCargo, SlateParty } from '@/hooks/usePartySlate';
import { useMunicipalityAssociationMap } from '@/hooks/useMunicipalityAssociation';
import { MapPin, Flame } from 'lucide-react';

type CargoFilter = 'all' | 'Deputado Federal' | 'Deputado Estadual';
type ViewMode = 'pins' | 'calor';

const PIN_COLOR: Record<SlateParty, Record<SlateCargo, string>> = {
  PL: { 'Deputado Federal': '#1D4ED8', 'Deputado Estadual': '#15803D' },
  Novo: { 'Deputado Federal': '#C2410C', 'Deputado Estadual': '#CA8A04' },
};

function pinIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 1 C7 1 2 6 2 13 c0 9 12 22 12 22 s12-13 12-22 c0-7-5-12-12-12 z"
      fill="${color}" stroke="#ffffff" stroke-width="2"
      style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45));"/>
    <circle cx="14" cy="13" r="4.5" fill="#ffffff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'chapa-pin-icon',
    iconSize: [28, 36],
    iconAnchor: [14, 35],
    tooltipAnchor: [0, -30],
  });
}

const PR_CENTER: [number, number] = [-24.6, -51.5];

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Cor pastel determinística por sigla da associação
function colorForAssoc(acronym: string): string {
  let h = 0;
  for (let i = 0; i < acronym.length; i++) h = (h * 31 + acronym.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 65% 72%)`;
}

// Lista de municípios IBGE para PR (id -> nome)
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

// GeoJSON dos municípios do Paraná
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

export default function MapaChapa({ rows, party }: { rows: SlateCandidate[]; party: string }) {
  const [cargo, setCargo] = useState<CargoFilter>('all');
  const [view, setView] = useState<ViewMode>('pins');

  const { data: assocMap } = useMunicipalityAssociationMap();
  const { data: ibgeNames } = useIbgeMunicipios();
  const { data: geo } = usePrGeoJson();

  const filtered = useMemo(
    () => rows.filter(r => cargo === 'all' || r.cargo === cargo),
    [rows, cargo],
  );

  const points = useMemo(() => {
    return filtered
      .map(r => {
        const g = resolveGeo({ id: r.id, city: r.city });
        if (!g) return null;
        return { ...r, lat: g.lat, lng: g.lng, approximate: g.approximate };
      })
      .filter(Boolean) as (SlateCandidate & { lat: number; lng: number; approximate: boolean })[];
  }, [filtered]);

  const heatClusters = useMemo(() => {
    const byCity = new Map<string, { lat: number; lng: number; count: number; city: string; names: string[] }>();
    for (const p of points) {
      const key = (p.city ?? 'sem-cidade').toLowerCase().trim();
      const cur = byCity.get(key);
      if (cur) {
        cur.count++;
        cur.names.push(p.name);
      } else {
        byCity.set(key, { lat: p.lat, lng: p.lng, count: 1, city: p.city ?? 'Sem cidade', names: [p.name] });
      }
    }
    return Array.from(byCity.values());
  }, [points]);

  const maxCount = Math.max(1, ...heatClusters.map(c => c.count));
  const missing = filtered.length - points.length;

  // Resolve associação por feature
  const featureInfo = useMemo(() => {
    if (!assocMap || !ibgeNames) return null;
    return (codarea: string): { name: string; acronym: string | null; assocName: string | null; color: string } => {
      const name = ibgeNames.get(codarea) ?? codarea;
      const assoc = assocMap.get(normalize(name));
      if (!assoc) return { name, acronym: null, assocName: null, color: 'hsl(220 10% 80%)' };
      return { name, acronym: assoc.acronym, assocName: assoc.name, color: colorForAssoc(assoc.acronym) };
    };
  }, [assocMap, ibgeNames]);

  // Legenda: lista de associações únicas
  const legend = useMemo(() => {
    if (!assocMap) return [];
    const seen = new Map<string, string>();
    assocMap.forEach(a => seen.set(a.acronym, a.name));
    return Array.from(seen.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([acronym, name]) => ({ acronym, name, color: colorForAssoc(acronym) }));
  }, [assocMap]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-card/50">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-bold">Distribuição da chapa — {party}</div>
            <div className="text-[11px] text-muted-foreground">
              {points.length} candidato(s) plotado(s){missing > 0 ? ` · ${missing} sem cidade reconhecida` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border border-border/60 bg-background/40 p-0.5">
            {([
              { v: 'all', label: 'Ambos' },
              { v: 'Deputado Federal', label: 'Federal' },
              { v: 'Deputado Estadual', label: 'Estadual' },
            ] as { v: CargoFilter; label: string }[]).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setCargo(opt.v)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                  cargo === opt.v ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md border border-border/60 bg-background/40 p-0.5">
            <button
              type="button"
              onClick={() => setView('pins')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded inline-flex items-center gap-1 ${
                view === 'pins' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3 h-3" /> Pins
            </button>
            <button
              type="button"
              onClick={() => setView('calor')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded inline-flex items-center gap-1 ${
                view === 'calor' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Flame className="w-3 h-3" /> Calor
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 460, background: 'hsl(var(--muted) / 0.3)' }}>
        <MapContainer center={PR_CENTER} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap, &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            opacity={0.35}
          />

          {geo && featureInfo && (
            <GeoJSON
              key={JSON.stringify({ a: !!assocMap, n: !!ibgeNames })}
              data={geo}
              style={(f: any) => {
                const info = featureInfo(String(f?.properties?.codarea ?? ''));
                return {
                  fillColor: info.color,
                  fillOpacity: 0.6,
                  color: '#ffffff',
                  weight: 0.6,
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
                  mouseover: (e: any) => e.target.setStyle({ weight: 1.5, fillOpacity: 0.8 }),
                  mouseout: (e: any) => e.target.setStyle({ weight: 0.6, fillOpacity: 0.6 }),
                });
              }}
            />
          )}

          <Pane name="heat-pane" style={{ zIndex: 500 }} />
          <Pane name="pins-pane" style={{ zIndex: 650 }} />

          {view === 'pins' && points.map(p => {
            const partyKey = (PIN_COLOR[party as SlateParty] ? (party as SlateParty) : 'PL');
            const color = PIN_COLOR[partyKey][p.cargo];
            return (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(color)} pane="pins-pane">
                <Tooltip direction="top">
                  <div className="text-xs">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-muted-foreground">{p.cargo}</div>
                    <div className="text-muted-foreground">{p.city ?? '—'}</div>
                    {p.approximate && <div className="text-[10px] italic text-muted-foreground">posição aproximada</div>}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

          {view === 'calor' && heatClusters.map((c, i) => {
            const ratio = c.count / maxCount;
            const color = ratio > 0.66 ? '#EF4444' : ratio > 0.33 ? '#F59E0B' : '#FACC15';
            const radius = 8000 + ratio * 22000;
            return (
              <Circle
                key={i}
                center={[c.lat, c.lng]}
                radius={radius}
                pane="heat-pane"
                pathOptions={{ color, fillColor: color, fillOpacity: 0.25 + ratio * 0.35, weight: 1 }}
              >
                <Tooltip direction="top">
                  <div className="text-xs">
                    <div className="font-semibold">{c.city}</div>
                    <div className="text-muted-foreground">{c.count} candidato(s)</div>
                  </div>
                </Tooltip>
              </Circle>
            );
          })}
        </MapContainer>
      </div>


      {/* Legenda Associações */}
      {legend.length > 0 && (
        <div className="px-3 py-2 border-t border-border/60 bg-card/50">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">Associações de Municípios</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {legend.map(l => (
              <span key={l.acronym} className="inline-flex items-center gap-1 text-[10px] text-foreground/80" title={l.name}>
                <span className="inline-block w-3 h-3 rounded-sm border border-border/60" style={{ background: l.color }} />
                {l.acronym}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legenda candidatos */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-border/60 bg-card/50 text-[11px] text-muted-foreground">
        {view === 'pins' ? (
          (() => {
            const partyKey = (PIN_COLOR[party as SlateParty] ? (party as SlateParty) : 'PL');
            return (
              <>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-white" style={{ background: PIN_COLOR[partyKey]['Deputado Federal'] }} />
                  {partyKey} Federal
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-white" style={{ background: PIN_COLOR[partyKey]['Deputado Estadual'] }} />
                  {partyKey} Estadual
                </span>
              </>
            );
          })()
        ) : (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#FACC15' }} />
              Baixa densidade
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
              Média
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
              Alta
            </span>
          </>
        )}
      </div>
    </Card>
  );
}
