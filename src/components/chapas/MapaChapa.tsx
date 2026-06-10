import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';
import { resolveGeo } from '@/lib/geo';
import type { SlateCandidate, SlateCargo } from '@/hooks/usePartySlate';
import { MapPin, Flame } from 'lucide-react';

type CargoFilter = 'all' | 'Deputado Federal' | 'Deputado Estadual';
type ViewMode = 'pins' | 'calor';

const CARGO_COLOR: Record<SlateCargo, string> = {
  'Deputado Federal': '#1F5AB4',
  'Deputado Estadual': '#2FA85A',
};

// Centro aproximado do Paraná
const PR_CENTER: [number, number] = [-24.6, -51.5];

export default function MapaChapa({ rows, party }: { rows: SlateCandidate[]; party: string }) {
  const [cargo, setCargo] = useState<CargoFilter>('all');
  const [view, setView] = useState<ViewMode>('pins');

  const filtered = useMemo(
    () => rows.filter(r => cargo === 'all' || r.cargo === cargo),
    [rows, cargo],
  );

  const points = useMemo(() => {
    return filtered
      .map(r => {
        const geo = resolveGeo({ id: r.id, city: r.city });
        if (!geo) return null;
        return { ...r, lat: geo.lat, lng: geo.lng, approximate: geo.approximate };
      })
      .filter(Boolean) as (SlateCandidate & { lat: number; lng: number; approximate: boolean })[];
  }, [filtered]);

  // Agregação por cidade para mapa de calor
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
          {/* Filtro cargo */}
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
                  cargo === opt.v
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Modo de visão */}
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

      <div style={{ height: 460 }}>
        <MapContainer center={PR_CENTER} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {view === 'pins' && points.map(p => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={6}
              pathOptions={{
                color: CARGO_COLOR[p.cargo],
                fillColor: CARGO_COLOR[p.cargo],
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <div className="text-xs">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-muted-foreground">{p.cargo}</div>
                  <div className="text-muted-foreground">{p.city ?? '—'}</div>
                  {p.approximate && <div className="text-[10px] italic text-muted-foreground">posição aproximada</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {view === 'calor' && heatClusters.map((c, i) => {
            const ratio = c.count / maxCount;
            // Cor gradiente: do âmbar ao vermelho conforme densidade
            const color = ratio > 0.66 ? '#EF4444' : ratio > 0.33 ? '#F59E0B' : '#FACC15';
            const radius = 8000 + ratio * 22000; // 8 km a 30 km
            return (
              <Circle
                key={i}
                center={[c.lat, c.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.25 + ratio * 0.35,
                  weight: 1,
                }}
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

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-border/60 bg-card/50 text-[11px] text-muted-foreground">
        {view === 'pins' ? (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CARGO_COLOR['Deputado Federal'] }} />
              Federal
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: CARGO_COLOR['Deputado Estadual'] }} />
              Estadual
            </span>
          </>
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
