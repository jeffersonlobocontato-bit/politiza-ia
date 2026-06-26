// Camada Leaflet reutilizável que plota uma lista de GeoLeads.
// Pins coloridos por TIPO/FUNÇÃO (assetColors), permitindo distinguir prefeito, vereador,
// liderança comunitária, coordenadores etc. no mesmo mapa.

import { useMemo } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { SOURCE_META } from '@/lib/geo';
import { useMacroRegionsDB } from '@/hooks/useDashboard';
import type { GeoLead } from '@/hooks/useGeoLeads';
import { typeMeta, geoLeadType, FAMILY_META, type AssetFamily } from '@/lib/assetColors';

interface Props {
  leads: GeoLead[];
  radius?: number;
  hiddenFamilies?: Set<AssetFamily>;
  hiddenTypes?: Set<string>;
}

export function LeadsLayer({ leads, radius = 5, hiddenFamilies, hiddenTypes }: Props) {
  const { data: macros = [] } = useMacroRegionsDB();
  const macroMap = useMemo(() => {
    const m = new Map<string, string>();
    (macros as any[]).forEach(r => m.set(r.id, r.name));
    return m;
  }, [macros]);

  const memberIds = useMemo(
    () => leads.filter(l => l.source === 'members').map(l => l.id),
    [leads]
  );

  const { data: memberMacros = {} } = useQuery<Record<string, string[]>>({
    queryKey: ['leads-member-macros', memberIds],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (db as any)
        .from('campaign_member_macroregions')
        .select('member_id, macroregion_id')
        .in('member_id', memberIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: any) => {
        (map[r.member_id] ||= []).push(r.macroregion_id);
      });
      return map;
    },
  });

  const resolveRegions = (l: GeoLead): string[] => {
    const ids = new Set<string>();
    if (l.source === 'members' && memberMacros[l.id]) memberMacros[l.id].forEach(id => ids.add(id));
    if (l.raw?.macroregion_id) ids.add(l.raw.macroregion_id);
    return Array.from(ids).map(id => macroMap.get(id)).filter(Boolean) as string[];
  };

  return (
    <>
      {leads.map(l => {
        const tMeta = typeMeta(geoLeadType(l.source, l.raw));
        if (hiddenFamilies?.has(tMeta.family)) return null;
        const sourceMeta = SOURCE_META[l.source];
        const regions = resolveRegions(l);
        return (
          <CircleMarker
            key={`${l.source}-${l.id}`}
            center={[l.point.lat, l.point.lng]}
            radius={radius}
            fillColor={tMeta.color}
            color="#ffffff"
            weight={1.2}
            fillOpacity={l.point.approximate ? 0.55 : 0.92}
            dashArray={l.point.approximate ? '2 3' : undefined}
          >
            <Popup className="leads-popup">
              <div style={{ color: '#ffffff', minWidth: 200 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: tMeta.color, fontWeight: 700 }}>
                  {tMeta.label} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {sourceMeta.label}</span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 2, color: '#ffffff' }}>{l.name}</div>
                {l.subtitle && <div style={{ fontSize: 12, color: '#e2e8f0' }}>{l.subtitle}</div>}
                {l.municipality && <div style={{ fontSize: 12, color: '#e2e8f0' }}>📍 {l.municipality}</div>}
                {regions.length > 0 && (
                  <div style={{ fontSize: 11, marginTop: 6 }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: '#94a3b8', marginBottom: 3 }}>
                      Região Política
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {regions.map(r => (
                        <span key={r} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(47,168,90,0.18)', color: '#86efac', border: '1px solid rgba(47,168,90,0.35)', borderRadius: 4 }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
