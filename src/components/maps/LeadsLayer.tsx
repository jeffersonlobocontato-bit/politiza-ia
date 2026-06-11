// Camada Leaflet reutilizável que plota uma lista de GeoLeads.
// Usa CircleMarker (sem dependência de ícones externos) para consistência com os mapas existentes.

import { CircleMarker, Popup } from 'react-leaflet';
import { SOURCE_META } from '@/lib/geo';
import type { GeoLead } from '@/hooks/useGeoLeads';

interface Props {
  leads: GeoLead[];
  radius?: number;
}

export function LeadsLayer({ leads, radius = 5 }: Props) {
  return (
    <>
      {leads.map(l => {
        const meta = SOURCE_META[l.source];
        return (
          <CircleMarker
            key={`${l.source}-${l.id}`}
            center={[l.point.lat, l.point.lng]}
            radius={radius}
            fillColor={meta.color}
            color="#ffffff"
            weight={1.2}
            fillOpacity={l.point.approximate ? 0.55 : 0.92}
            dashArray={l.point.approximate ? '2 3' : undefined}
          >
            <Popup className="leads-popup">
              <div style={{ color: '#ffffff', minWidth: 200 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: meta.color, fontWeight: 700 }}>
                  {meta.label}
                </div>
                <div style={{ fontWeight: 700, marginTop: 2, color: '#ffffff' }}>{l.name}</div>
                {l.subtitle && <div style={{ fontSize: 12, color: '#e2e8f0' }}>{l.subtitle}</div>}
                {l.municipality && <div style={{ fontSize: 12, color: '#e2e8f0' }}>📍 {l.municipality}</div>}
                {l.point.approximate && (
                  <div style={{ fontSize: 10, marginTop: 4, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, display: 'inline-block' }}>
                    Aproximado ({l.point.approxLabel})
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

interface LegendProps {
  active: Record<string, boolean>;
  counts: Partial<Record<string, number>>;
  onToggle: (source: string) => void;
}

export function LeadsLegend({ active, counts, onToggle }: LegendProps) {
  return (
    <div className="space-y-1">
      {(Object.keys(SOURCE_META) as Array<keyof typeof SOURCE_META>).map(key => {
        const meta = SOURCE_META[key];
        const on = active[key];
        const n = counts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors ${
              on ? 'bg-card border border-border' : 'opacity-50 hover:opacity-80'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
              <span className="text-foreground">{meta.label}</span>
            </span>
            <span className="text-muted-foreground tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
