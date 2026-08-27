// Gera um SVG do mapa do Paraná para impressão de rotas de distribuição:
// municípios coloridos pela associação, pins numerados das cidades da rota
// ligados na sequência e legenda apenas com os nomes das cidades entregues.

import { db } from '@/lib/db';

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function pastelForAssoc(acronym: string): string {
  let h = 0;
  for (let i = 0; i < acronym.length; i++) h = (h * 31 + acronym.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 55% 85%)`;
}

export interface RotaCidade {
  municipio: string;
  codigo_ibge?: string | null;
  ordem: number;
}

interface MapaBase {
  geo: any;
  /** codigo_ibge -> { nome, lat, lng } */
  cidades: Map<string, { nome: string; lat: number; lng: number }>;
  /** nome normalizado -> codigo_ibge */
  porNome: Map<string, string>;
  /** nome normalizado do município -> sigla da associação */
  assocPorCidade: Map<string, string>;
}

let cache: Promise<MapaBase> | null = null;

async function loadBase(): Promise<MapaBase> {
  if (cache) return cache;
  cache = (async () => {
    const [geoRes, mun, assocs, members] = await Promise.all([
      fetch(
        'https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio',
      ).then(r => r.json()),
      db.from('pr_municipios').select('nome, codigo_ibge, lat, lng'),
      db.from('municipality_associations').select('id, acronym'),
      db.from('association_members').select('association_id, municipality_name'),
    ]);

    const cidades = new Map<string, { nome: string; lat: number; lng: number }>();
    const porNome = new Map<string, string>();
    (mun.data ?? []).forEach((m: any) => {
      if (!m.codigo_ibge || m.lat == null || m.lng == null) return;
      cidades.set(String(m.codigo_ibge), { nome: m.nome, lat: m.lat, lng: m.lng });
      porNome.set(normalize(m.nome), String(m.codigo_ibge));
    });

    const siglaPorId = new Map<string, string>();
    (assocs.data ?? []).forEach((a: any) => siglaPorId.set(a.id, a.acronym));
    const assocPorCidade = new Map<string, string>();
    (members.data ?? []).forEach((m: any) => {
      const sigla = siglaPorId.get(m.association_id);
      if (sigla) assocPorCidade.set(normalize(m.municipality_name), sigla);
    });

    return { geo: geoRes, cidades, porNome, assocPorCidade };
  })();
  return cache;
}

const W = 900;
const H = 520;
const PAD = 16;

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/**
 * Retorna o SVG (string) do mapa da rota, ou string vazia se não houver dados.
 */
export async function buildRotaMapaSvg(cidadesRota: RotaCidade[], titulo: string): Promise<string> {
  let base: MapaBase;
  try {
    base = await loadBase();
  } catch {
    return '';
  }
  const feats: any[] = base.geo?.features ?? [];
  if (feats.length === 0) return '';

  // --- projeção equiretangular ajustada ---
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const scanRing = (ring: any[]) => {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };
  for (const f of feats) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const p of polys) scanRing(p[0]);
  }

  const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const kx = Math.cos(midLatRad);
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;
  const px = (lng: number) => offX + (lng - minLng) * kx * scale;
  const py = (lat: number) => offY + (maxLat - lat) * scale;

  // --- cidades da rota resolvidas ---
  const pontos = cidadesRota
    .map(c => {
      const code = c.codigo_ibge && base.cidades.has(String(c.codigo_ibge))
        ? String(c.codigo_ibge)
        : base.porNome.get(normalize(c.municipio));
      const info = code ? base.cidades.get(code) : undefined;
      if (!info) return null;
      return { code: code!, nome: info.nome, ordem: c.ordem, x: px(info.lng), y: py(info.lat) };
    })
    .filter(Boolean) as { code: string; nome: string; ordem: number; x: number; y: number }[];

  const rotaCodes = new Set(pontos.map(p => p.code));

  // --- polígonos ---
  const paths = feats
    .map((f: any) => {
      const code = String(f?.properties?.codarea ?? '');
      const info = base.cidades.get(code);
      const sigla = info ? base.assocPorCidade.get(normalize(info.nome)) : undefined;
      const fill = sigla ? pastelForAssoc(sigla) : '#f3f4f6';
      const naRota = rotaCodes.has(code);
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      const d = polys
        .map((poly: any[]) =>
          poly
            .map((ring: any[]) =>
              ring
                .map(([lng, lat]: [number, number], i: number) =>
                  `${i === 0 ? 'M' : 'L'}${px(lng).toFixed(1)},${py(lat).toFixed(1)}`,
                )
                .join('') + 'Z',
            )
            .join(''),
        )
        .join('');
      return `<path d="${d}" fill="${naRota ? '#1F5AB4' : fill}" fill-opacity="${naRota ? 0.35 : 1}" stroke="#ffffff" stroke-width="0.5"/>`;
    })
    .join('');

  // --- linha da rota ---
  const ordenados = [...pontos].sort((a, b) => a.ordem - b.ordem);
  const linha = ordenados.length > 1
    ? `<polyline points="${ordenados.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"
         fill="none" stroke="#1A2A45" stroke-width="1.8" stroke-dasharray="5 3" stroke-linejoin="round"/>`
    : '';

  const pins = ordenados
    .map(
      (p, i) => `
      <g>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="8.5" fill="#2FA85A" stroke="#ffffff" stroke-width="1.6"/>
        <text x="${p.x.toFixed(1)}" y="${(p.y + 3).toFixed(1)}" text-anchor="middle"
              font-size="9" font-weight="bold" fill="#ffffff">${i + 1}</text>
        <text x="${(p.x + 11).toFixed(1)}" y="${(p.y + 3).toFixed(1)}"
              font-size="8.5" font-weight="600" fill="#111827"
              stroke="#ffffff" stroke-width="2.2" paint-order="stroke">${esc(p.nome)}</text>
      </g>`,
    )
    .join('');

  const legenda = ordenados
    .map(
      (p, i) =>
        `<span style="display:inline-block;margin:0 10px 4px 0;font-size:9px;">
           <strong style="background:#2FA85A;color:#fff;border-radius:8px;padding:1px 5px;">${i + 1}</strong>
           ${esc(p.nome)}
         </span>`,
    )
    .join('');

  return `
    <div class="mapa-rota">
      <h3>${esc(titulo)} — sequência da rota</h3>
      <svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
        <rect width="${W}" height="${H}" fill="#ffffff"/>
        ${paths}
        ${linha}
        ${pins}
      </svg>
      <div class="mapa-legenda">${legenda || 'Nenhuma cidade localizada no mapa.'}</div>
    </div>`;
}
