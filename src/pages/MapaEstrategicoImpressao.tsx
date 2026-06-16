// Página standalone do modo "Imprimir mapa". Renderiza folha em escala WYSIWYG.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, CircleMarker, Tooltip } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';

import { PrintBackground } from '@/components/maps/print/PrintBackground';
import { PrintLegendFooter } from '@/components/maps/print/PrintLegendFooter';
import { PrintConfigPanel } from '@/components/maps/print/PrintConfigPanel';
import { buildPaperSpec, type PaperFormat, type PaperOrientation } from '@/lib/printScale';
import { PRINT_LAYERS, DEFAULT_PRINT_LAYERS, type PrintLayerId } from '@/lib/printLayers';
import { buildCityIndex, useDistributedPins, type PrintPin } from '@/hooks/useDistributedPins';
import { useGeoLeads } from '@/hooks/useGeoLeads';
import { useEmendas } from '@/hooks/useEmendas';
import { FAIXAS, getFaixaByValor } from '@/lib/emendas';
import { SOURCE_META, type GeoSource } from '@/lib/geo';

const MM_TO_PX = 3.78; // 96dpi: 1mm ≈ 3.78px

function useIbgeNames() {
  return useQuery({
    queryKey: ['ibge-municipios-pr'],
    queryFn: async () => {
      const r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios');
      const arr = (await r.json()) as { id: number; nome: string }[];
      const m = new Map<string, string>();
      arr.forEach(x => m.set(String(x.id), x.nome));
      return m;
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

function usePrGeo() {
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

export default function MapaEstrategicoImpressao() {
  const navigate = useNavigate();

  const [paperFormat, setPaperFormat] = useState<PaperFormat>('A3');
  const [paperOrientation, setPaperOrientation] = useState<PaperOrientation>('landscape');
  const paper = useMemo(() => buildPaperSpec(paperFormat, paperOrientation), [paperFormat, paperOrientation]);

  const [selected, setSelected] = useState<Record<PrintLayerId, boolean>>({ ...DEFAULT_PRINT_LAYERS });
  const [showAssociations, setShowAssociations] = useState(true);
  const [showCityLabels, setShowCityLabels] = useState(true);
  const [title, setTitle] = useState('Mapa Estratégico — Paraná 2026');
  const [subtitle, setSubtitle] = useState(new Date().toLocaleDateString('pt-BR'));

  // Dados
  const enabledSources = useMemo(() => {
    const out: Record<GeoSource, boolean> = {
      leaders: !!selected.leaders, assets: !!selected.assets, members: !!selected.members,
      candidates: !!selected.candidates, actions: !!selected.actions,
      alerts: !!selected.alerts, interviews: !!selected.interviews,
    };
    return out;
  }, [selected]);
  const { data: leads = [] } = useGeoLeads(enabledSources);
  const { data: emendas = [] } = useEmendas();
  const { data: geo } = usePrGeo();
  const { data: ibgeNames } = useIbgeNames();

  const cityIndex = useMemo(() => (geo ? buildCityIndex(geo, ibgeNames) : null), [geo, ibgeNames]);

  // Pins normalizados
  const rawPins: PrintPin[] = useMemo(() => {
    const out: PrintPin[] = [];
    for (const l of leads) {
      if (!selected[l.source as PrintLayerId]) continue;
      out.push({
        id: `${l.source}-${l.id}`,
        source: l.source,
        color: SOURCE_META[l.source].color,
        lat: l.point.lat,
        lng: l.point.lng,
        raw: l,
      });
    }
    if (selected.emendas) {
      for (const e of emendas) {
        if (!e.lat || !e.lng) continue;
        const faixa = getFaixaByValor(e.valor_total);
        out.push({
          id: `emendas-${e.id}`,
          source: 'emendas',
          color: faixa.color,
          lat: e.lat,
          lng: e.lng,
          raw: { ...e, faixa },
        });
      }
    }
    return out;
  }, [leads, emendas, selected]);

  const pins = useDistributedPins({ cityIndex, pins: rawPins, paper });

  // Contagens
  const counts = useMemo(() => {
    const c: Partial<Record<PrintLayerId, number>> = {};
    for (const p of rawPins) c[p.source as PrintLayerId] = (c[p.source as PrintLayerId] ?? 0) + 1;
    return c;
  }, [rawPins]);

  const emendasByFaixa = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of emendas) {
      if (!e.lat || !e.lng) continue;
      const f = getFaixaByValor(e.valor_total);
      map.set(f.id, (map.get(f.id) ?? 0) + 1);
    }
    return FAIXAS.filter(f => (map.get(f.id) ?? 0) > 0).map(f => ({
      id: f.id, label: f.label, color: f.color, count: map.get(f.id) ?? 0,
    }));
  }, [emendas]);

  // Dimensões em px
  const sheetWidthPx = paper.widthMm * MM_TO_PX;
  const sheetHeightPx = paper.heightMm * MM_TO_PX;
  const mapHeightPx = sheetHeightPx - 90 - 30; // legenda ≈ 90, header ≈ 30
  const handlePrint = () => window.print();

  return (
    <div
      className="print-shell"
      style={{ display: 'flex', minHeight: '100vh', background: '#E2E8F0' }}
    >
      <PrintConfigPanel
        paperFormat={paperFormat}
        paperOrientation={paperOrientation}
        onPaperChange={(f, o) => { setPaperFormat(f); setPaperOrientation(o); }}
        selected={selected}
        onToggleLayer={(id) => setSelected(s => ({ ...s, [id]: !s[id] }))}
        counts={counts}
        showAssociations={showAssociations}
        onToggleAssociations={() => setShowAssociations(v => !v)}
        showCityLabels={showCityLabels}
        onToggleCityLabels={() => setShowCityLabels(v => !v)}
        title={title}
        onTitleChange={setTitle}
        subtitle={subtitle}
        onSubtitleChange={setSubtitle}
        onPrint={handlePrint}
        onBack={() => navigate('/mapa')}
      />

      <main
        className="print-stage"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {/* Folha */}
        <div
          className="print-sheet"
          style={{
            width: `${sheetWidthPx}px`,
            height: `${sheetHeightPx}px`,
            background: '#ffffff',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header da folha */}
          <div
            style={{
              padding: '4mm 8mm',
              borderBottom: '1px solid #E2E8F0',
              fontFamily: "'DM Sans', sans-serif",
              color: '#1A2A45',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '11pt', fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: '8pt', color: '#64748B' }}>
              {paper.format} {paper.orientation === 'landscape' ? 'paisagem' : 'retrato'} · {pins.length} pins
            </div>
          </div>

          {/* Mapa */}
          <div style={{ flex: 1, position: 'relative', background: '#ffffff' }}>
            <MapContainer
              center={[-24.7, -51.5]}
              zoom={7}
              style={{ height: '100%', width: '100%', background: '#ffffff' }}
              zoomControl={false}
              scrollWheelZoom={false}
              attributionControl={false}
            >
              <PrintBackground
                showAssociations={showAssociations}
                showCityLabels={showCityLabels}
                cityLabelPx={paper.cityLabelPx}
              />
              {pins.map(p => (
                <CircleMarker
                  key={p.id}
                  center={[p.finalLat ?? p.lat, p.finalLng ?? p.lng]}
                  radius={(p.sizePx ?? paper.pinMinPx) / 2}
                  fillColor={p.color}
                  color="#1A2A45"
                  weight={0.6}
                  fillOpacity={0.92}
                >
                  <Tooltip direction="top" offset={[0, -4]}>
                    <strong>{p.raw?.name ?? p.raw?.ente_federativo ?? '—'}</strong>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Rodapé */}
          <PrintLegendFooter
            counts={counts}
            selected={selected}
            bigNumberPt={paper.bigNumberPt}
            title={title}
            subtitle={subtitle}
            emendasByFaixa={emendasByFaixa}
          />
        </div>
      </main>

      <style>{`
        @media print {
          @page {
            size: ${paper.format} ${paper.orientation};
            margin: 0;
          }
          html, body, #root {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-hide { display: none !important; }
          .print-stage {
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .print-shell {
            background: #ffffff !important;
            display: block !important;
            min-height: auto !important;
          }
          .print-sheet {
            box-shadow: none !important;
            width: ${paper.widthMm}mm !important;
            height: ${paper.heightMm}mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
