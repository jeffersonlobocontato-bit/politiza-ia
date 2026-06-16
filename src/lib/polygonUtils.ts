// Utilitários simples para polígonos GeoJSON: centroide, bbox, area, point-in-polygon.
// Operam em coordenadas [lng, lat] (formato GeoJSON).

export type Ring = [number, number][]; // [ [lng,lat], ... ]
export type Poly = Ring[]; // outer + holes
export type MultiPoly = Poly[]; // várias features

export interface GeomInfo {
  centroid: [number, number]; // [lng, lat]
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  /** Soma de área (graus²), usada apenas relativamente. */
  area: number;
}

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function ringCentroid(ring: Ring): { c: [number, number]; a: number } {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, n = ring.length; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
    a += f;
  }
  a /= 2;
  if (Math.abs(a) < 1e-12) {
    // fallback: média
    const mx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const my = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return { c: [mx, my], a: 0 };
  }
  return { c: [cx / (6 * a), cy / (6 * a)], a };
}

export function geomInfoFromGeoJsonGeometry(geom: any): GeomInfo {
  const polys: Poly[] =
    geom.type === 'Polygon'
      ? [geom.coordinates as Poly]
      : geom.type === 'MultiPolygon'
        ? (geom.coordinates as MultiPoly)
        : [];

  let totalArea = 0;
  let cx = 0, cy = 0;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

  for (const poly of polys) {
    const outer = poly[0];
    if (!outer || outer.length < 4) continue;
    const { c, a } = ringCentroid(outer);
    const absA = Math.abs(a);
    totalArea += absA;
    cx += c[0] * absA;
    cy += c[1] * absA;
    for (const [lng, lat] of outer) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }

  const centroid: [number, number] = totalArea > 0
    ? [cx / totalArea, cy / totalArea]
    : [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  return {
    centroid,
    bbox: [minLng, minLat, maxLng, maxLat],
    area: totalArea,
  };
}

function pointInRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(lng: number, lat: number, geom: any): boolean {
  const polys: Poly[] =
    geom.type === 'Polygon'
      ? [geom.coordinates as Poly]
      : geom.type === 'MultiPolygon'
        ? (geom.coordinates as MultiPoly)
        : [];
  for (const poly of polys) {
    if (poly.length === 0) continue;
    if (pointInRing(lng, lat, poly[0])) {
      // verificar buracos
      let inHole = false;
      for (let k = 1; k < poly.length; k++) {
        if (pointInRing(lng, lat, poly[k])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
  }
  return false;
}
