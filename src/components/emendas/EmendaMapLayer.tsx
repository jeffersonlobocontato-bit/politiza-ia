// src/components/emendas/EmendaMapLayer.tsx
// Camada de emendas para o mapa da Sala de Guerra
// Uso: <EmendaMapLayer active={showEmendas} />

import { useState, useMemo } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { useEmendas } from '@/hooks/useEmendas';
import {
  FAIXAS, STATUS_CONFIG, getFaixaByValor, fmtBRL,
  type EmendaFaixa, type EmendaStatus,
} from '@/lib/emendas';

interface Props {
  active: boolean;
}

export function EmendaMapLayer({ active }: Props) {
  const { data: emendas = [] } = useEmendas();

  const geoEmendas = useMemo(
    () => emendas.filter(e => e.lat && e.lng),
    [emendas]
  );

  if (!active || geoEmendas.length === 0) return null;

  return (
    <>
      {geoEmendas.map(e => {
        const faixa  = getFaixaByValor(e.valor_total);
        const status = STATUS_CONFIG[e.status];
        const radius = faixa.id === 'f7_estrategica' ? 12
          : faixa.id === 'f6_muito_alta' ? 10
          : faixa.id === 'f5_alta'       ? 8
          : faixa.id === 'f4_relevante'  ? 7
          : 5;

        return (
          <CircleMarker
            key={`emenda-${e.id}`}
            center={[e.lat!, e.lng!]}
            radius={radius}
            fillColor={faixa.color}
            color="#ffffff"
            weight={1.5}
            fillOpacity={0.85}
          >
            <Popup>
              <div style={{ minWidth: 200, color: '#fff' }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: faixa.color, fontWeight: 700 }}>
                  Emenda · {faixa.labelCurto}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{e.ente_federativo}</div>
                {e.area_tematica && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>📋 {e.area_tematica}</div>
                )}
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: faixa.color }}>{fmtBRL(e.valor_total)}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                    background: status.colorLight, color: status.colorText,
                  }}>{status.label}</span>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>LOA {e.exercicio}</div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ─── Legend widget (para o painel lateral da Sala de Guerra) ─────────────────

interface LegendProps {
  active: boolean;
  count: number;
  onToggle: () => void;
}

export function EmendaMapLegend({ active, count, onToggle }: LegendProps) {
  return (
    <div className="pt-3 border-t border-border">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-opacity ${
          active ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <span
          className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
          style={{ background: '#378ADD' }}
        />
        <span className="text-foreground font-medium">Emendas Parlamentares</span>
        <span className="ml-auto text-muted-foreground">{count}</span>
      </button>

      {active && (
        <div className="mt-2 ml-5 space-y-1">
          {FAIXAS.map(f => (
            <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
              {f.labelCurto}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
