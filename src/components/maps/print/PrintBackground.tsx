// Camada de fundo cartográfico para impressão: contornos das 399 cidades em branco,
// nomes das cidades, e 19 associações com leve preenchimento pastel + Curitiba destacada.

import { useMemo } from 'react';
import { GeoJSON, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { useMunicipalityAssociationMap } from '@/hooks/useMunicipalityAssociation';
import { geomInfoFromGeoJsonGeometry } from '@/lib/polygonUtils';

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function pastelForAssoc(acronym: string): string {
  let h = 0;
  for (let i = 0; i < acronym.length; i++) h = (h * 31 + acronym.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 35% 92%)`;
}

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

interface Props {
  showAssociations: boolean;
  showCityLabels: boolean;
  cityLabelPx: number;
}

export function PrintBackground({ showAssociations, showCityLabels, cityLabelPx }: Props) {
  const map = useMap();
  const { data: assocMap } = useMunicipalityAssociationMap();
  const { data: ibgeNames } = useIbgeNames();
  const { data: geo } = usePrGeo();

  const styleFor = useMemo(() => {
    return (f: any) => {
      const code = String(f?.properties?.codarea ?? '');
      const name = ibgeNames?.get(code) ?? '';
      const assoc = assocMap?.get(normalize(name));
      const isCuritiba = normalize(name) === 'curitiba';
      if (isCuritiba) {
        return { fillColor: '#ffffff', fillOpacity: 1, color: '#1A2A45', weight: 1.6 };
      }
      const fill = showAssociations && assoc ? pastelForAssoc(assoc.acronym) : '#ffffff';
      return {
        fillColor: fill,
        fillOpacity: showAssociations && assoc ? 0.55 : 1,
        color: '#9CA3AF',
        weight: 0.5,
      };
    };
  }, [assocMap, ibgeNames, showAssociations]);

  // Borda mais grossa para associações: desenha overlay separado dissolvendo bordas
  // entre cidades da mesma associação. Solução leve: desenhar uma 2ª camada com
  // borda em cor escura apenas onde a vizinha pertence a outra assoc. Para manter
  // simplicidade do MVP, reforçamos com Curitiba destacada acima; bordas inter-
  // associações ficam um pouco visíveis através do tom pastel.

  const cityLabels = useMemo(() => {
    if (!geo?.features || !ibgeNames) return [];
    const zoom = map.getZoom();
    // só mostra labels se o zoom é suficiente
    const minArea = zoom < 7 ? 0.03 : zoom < 8 ? 0.008 : 0;
    return geo.features
      .map((f: any) => {
        const code = String(f?.properties?.codarea ?? '');
        const name = ibgeNames.get(code) ?? '';
        const info = geomInfoFromGeoJsonGeometry(f.geometry);
        return { code, name, centroid: info.centroid, area: info.area };
      })
      .filter((c: any) => c.area >= minArea && c.name);
  }, [geo, ibgeNames, map]);

  if (!geo) return null;

  return (
    <>
      <GeoJSON
        key={`bg-${showAssociations ? 'a' : 'na'}`}
        data={geo}
        style={styleFor}
        interactive={false}
      />
      {showCityLabels &&
        cityLabels.map((c: any) => (
          <Marker
            key={`lbl-${c.code}`}
            position={[c.centroid[1], c.centroid[0]]}
            interactive={false}
            icon={L.divIcon({
              className: 'print-city-label',
              html: `<span style="
                font-family: 'DM Sans', sans-serif;
                font-size: ${cityLabelPx}px;
                color: #374151;
                text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff;
                white-space: nowrap;
                pointer-events: none;
              ">${c.name}</span>`,
              iconSize: [1, 1],
              iconAnchor: [0, 0],
            })}
          />
        ))}
    </>
  );
}
