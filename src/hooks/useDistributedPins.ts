// Distribui pins dentro do polígono de sua cidade para evitar sobreposição.
// Estratégia: agrupa pins por código IBGE da cidade (point-in-polygon contra as
// 399 features do GeoJSON do PR), depois distribui em rings concêntricos a partir
// do centroide, escalado pelo raio da bbox do polígono.

import { useMemo } from 'react';
import { geomInfoFromGeoJsonGeometry, pointInGeometry, type GeomInfo } from '@/lib/polygonUtils';
import type { PaperSpec } from '@/lib/printScale';

export interface PrintPin {
  id: string;
  source: string; // category key used in legend
  color: string;
  lat: number;
  lng: number;
  /** Tamanho final em px (preenchido pelo hook). */
  sizePx?: number;
  /** Coords ajustadas (preenchidas pelo hook). */
  finalLat?: number;
  finalLng?: number;
  /** Cidade resolvida. */
  cityCode?: string | null;
  raw?: any;
}

interface CityIndex {
  byCode: Map<string, { info: GeomInfo; geom: any; name: string }>;
}

export function buildCityIndex(geo: any, ibgeNames?: Map<string, string>): CityIndex {
  const byCode = new Map<string, { info: GeomInfo; geom: any; name: string }>();
  if (!geo?.features) return { byCode };
  for (const f of geo.features) {
    const code = String(f?.properties?.codarea ?? '');
    if (!code) continue;
    const info = geomInfoFromGeoJsonGeometry(f.geometry);
    byCode.set(code, { info, geom: f.geometry, name: ibgeNames?.get(code) ?? code });
  }
  return { byCode };
}

function findCityForPoint(lng: number, lat: number, index: CityIndex): string | null {
  // Fast path: filtra por bbox
  for (const [code, c] of index.byCode) {
    const [minLng, minLat, maxLng, maxLat] = c.info.bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    if (pointInGeometry(lng, lat, c.geom)) return code;
  }
  // Fallback: cidade cujo centroide é o mais próximo
  let bestCode: string | null = null;
  let bestDist = Infinity;
  for (const [code, c] of index.byCode) {
    const dx = c.info.centroid[0] - lng;
    const dy = c.info.centroid[1] - lat;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestCode = code;
    }
  }
  return bestCode;
}

function ringPositions(count: number): Array<{ ring: number; angle: number }> {
  if (count === 1) return [{ ring: 0, angle: 0 }];
  const out: Array<{ ring: number; angle: number }> = [{ ring: 0, angle: 0 }];
  let remaining = count - 1;
  let ring = 1;
  while (remaining > 0) {
    const slots = Math.min(remaining, 6 * ring);
    for (let i = 0; i < slots; i++) {
      out.push({ ring, angle: (i / slots) * Math.PI * 2 });
    }
    remaining -= slots;
    ring++;
  }
  return out;
}

export interface DistributeOptions {
  cityIndex: CityIndex | null;
  pins: PrintPin[];
  paper: PaperSpec;
}

/**
 * Retorna pins com finalLat/finalLng/sizePx ajustados para impressão.
 */
export function useDistributedPins({ cityIndex, pins, paper }: DistributeOptions): PrintPin[] {
  return useMemo(() => {
    if (!cityIndex || cityIndex.byCode.size === 0) return pins;

    // 1) atribuir cidade a cada pin
    const withCity = pins.map(p => ({
      ...p,
      cityCode: p.cityCode ?? findCityForPoint(p.lng, p.lat, cityIndex),
    }));

    // 2) agrupar por cidade
    const groups = new Map<string, PrintPin[]>();
    for (const p of withCity) {
      const key = p.cityCode ?? '__none__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    const out: PrintPin[] = [];

    for (const [code, group] of groups) {
      const city = cityIndex.byCode.get(code);
      if (!city) {
        // sem cidade resolvida — mantém coord original
        for (const p of group) out.push({ ...p, finalLat: p.lat, finalLng: p.lng, sizePx: paper.pinMinPx });
        continue;
      }

      const N = group.length;
      const [minLng, minLat, maxLng, maxLat] = city.info.bbox;
      const halfLng = (maxLng - minLng) / 2;
      const halfLat = (maxLat - minLat) / 2;
      // raio "seguro" dentro do bbox (60% do menor semi-eixo)
      const maxRadius = Math.min(halfLng, halfLat) * 0.6;

      // tamanho do pin: cresce com tamanho da cidade, decresce com densidade
      const densityFactor = 1 / Math.log2(N + 2);
      const sizeBase = (paper.pinMinPx + paper.pinMaxPx) / 2;
      let sizePx = Math.max(paper.pinMinPx, Math.min(paper.pinMaxPx, sizeBase * densityFactor * 1.4));
      // se cidade é minúscula, reduz mais
      if (maxRadius < 0.01) sizePx = Math.max(paper.pinMinPx * 0.7, sizePx * 0.7);

      const positions = ringPositions(N);
      const ringStep = N <= 1 ? 0 : maxRadius / Math.max(1, Math.ceil(Math.sqrt(N / 6)));

      group.forEach((p, idx) => {
        const pos = positions[idx];
        const r = pos.ring * ringStep;
        const dLng = Math.cos(pos.angle) * r;
        const dLat = Math.sin(pos.angle) * r;
        out.push({
          ...p,
          finalLng: city.info.centroid[0] + dLng,
          finalLat: city.info.centroid[1] + dLat,
          sizePx,
        });
      });
    }

    return out;
  }, [cityIndex, pins, paper]);
}
