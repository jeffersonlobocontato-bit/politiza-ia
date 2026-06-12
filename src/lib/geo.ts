// Helpers de geolocalização universal — usa lat/lng do registro quando disponível,
// senão tenta centróide do município (mockData) ou centro da macrorregião,
// aplicando jitter determinístico para evitar sobreposição de marcadores.

import { municipalities, macroRegions } from '@/data/mockData';

export type GeoSource = 'leaders' | 'assets' | 'members' | 'actions' | 'interviews' | 'alerts' | 'candidates';

export interface ResolvedPoint {
  lat: number;
  lng: number;
  approximate: boolean; // true se veio de centróide/macrorregião
  approxLabel?: string; // 'centróide da cidade' | 'centro da macrorregião'
}

// Índice: nome normalizado -> { lat, lng }
const cityIndex = new Map<string, { lat: number; lng: number }>();
for (const m of municipalities) {
  if (typeof m.lat === 'number' && typeof m.lng === 'number') {
    cityIndex.set(normalizeCity(m.name), { lat: m.lat, lng: m.lng });
  }
}

const macroIndex = new Map<string, { lat: number; lng: number }>();
for (const r of macroRegions as any[]) {
  const lat = r.centerLat ?? r.center_lat;
  const lng = r.centerLng ?? r.center_lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    macroIndex.set(r.id, { lat, lng });
  }
}

function normalizeCity(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Hash determinístico simples (string -> [-1, 1])
function hashFloat(seed: string, salt: string): number {
  let h = 2166136261;
  const s = seed + '::' + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

// Aplica jitter determinístico em torno do ponto (~0.6 km a 0.8 km)
function applyJitter(lat: number, lng: number, seed: string, scale = 0.008): { lat: number; lng: number } {
  return {
    lat: lat + hashFloat(seed, 'lat') * scale,
    lng: lng + hashFloat(seed, 'lng') * scale,
  };
}

interface GeoInput {
  id: string;
  lat?: number | null;
  lng?: number | null;
  municipality?: string | null;
  city?: string | null;
  macroregion_id?: string | null;
}

export function resolveGeo(rec: GeoInput): ResolvedPoint | null {
  if (typeof rec.lat === 'number' && typeof rec.lng === 'number' && !isNaN(rec.lat) && !isNaN(rec.lng)) {
    return { lat: rec.lat, lng: rec.lng, approximate: false };
  }
  const cityKey = normalizeCity(rec.municipality ?? rec.city ?? null);
  if (cityKey && cityIndex.has(cityKey)) {
    const c = cityIndex.get(cityKey)!;
    const j = applyJitter(c.lat, c.lng, rec.id);
    return { ...j, approximate: true, approxLabel: 'centróide da cidade' };
  }
  if (rec.macroregion_id && macroIndex.has(rec.macroregion_id)) {
    const c = macroIndex.get(rec.macroregion_id)!;
    const j = applyJitter(c.lat, c.lng, rec.id, 0.18);
    return { ...j, approximate: true, approxLabel: 'centro da macrorregião' };
  }
  return null;
}

export const SOURCE_META: Record<GeoSource, { label: string; color: string; legend: string }> = {
  leaders:    { label: 'Lideranças (CRM)',     color: '#2FA85A', legend: 'Verde'    },
  assets:     { label: 'Ativos Políticos',     color: '#1F5AB4', legend: 'Azul'     },
  members:    { label: 'Membros da Campanha',  color: '#1A2A45', legend: 'Navy'     },
  actions:    { label: 'Ações de Campo',       color: '#F59E0B', legend: 'Âmbar'    },
  interviews: { label: 'Entrevistas Tracking', color: '#06B6D4', legend: 'Ciano'    },
  alerts:     { label: 'Alertas Operacionais', color: '#EF4444', legend: 'Vermelho' },
};
