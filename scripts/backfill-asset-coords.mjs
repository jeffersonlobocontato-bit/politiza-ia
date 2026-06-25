// Backfill political_assets.lat/lng usando centroides do IBGE para municípios do PR.
import pg from 'pg';

const IBGE_NAMES = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios';
const IBGE_GEO = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio';

const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

function ringCentroid(ring){
  let a=0,cx=0,cy=0;
  for(let i=0;i<ring.length-1;i++){
    const [x1,y1]=ring[i], [x2,y2]=ring[i+1];
    const f=x1*y2-x2*y1; a+=f; cx+=(x1+x2)*f; cy+=(y1+y2)*f;
  }
  a/=2; return [cx/(6*a), cy/(6*a), Math.abs(a)];
}
function geometryCentroid(g){
  const polys = g.type==='Polygon' ? [g.coordinates] : g.coordinates;
  let bestA=0, best=[0,0];
  for(const poly of polys){
    const [cx,cy,a] = ringCentroid(poly[0]);
    if(a>bestA){ bestA=a; best=[cx,cy]; }
  }
  return best; // [lng,lat]
}

const main = async () => {
  console.log('Fetching IBGE names...');
  const names = await (await fetch(IBGE_NAMES)).json();
  const codeToName = new Map(names.map(x => [String(x.id), x.nome]));

  console.log('Fetching IBGE geometries...');
  const geo = await (await fetch(IBGE_GEO)).json();

  const centroidByName = new Map();
  for(const f of geo.features){
    const code = String(f.properties.codarea);
    const name = codeToName.get(code);
    if(!name) continue;
    const [lng,lat] = geometryCentroid(f.geometry);
    centroidByName.set(norm(name), { lat, lng, name });
  }
  console.log(`Built centroid map for ${centroidByName.size} PR municipalities.`);

  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl:{rejectUnauthorized:false} });
  await client.connect();

  const { rows } = await client.query(`SELECT id, municipality FROM political_assets WHERE deleted_at IS NULL AND (lat IS NULL OR lng IS NULL) AND municipality IS NOT NULL`);
  console.log(`Need to backfill ${rows.length} assets.`);

  let ok=0, miss=0;
  const missing = new Set();
  for(const r of rows){
    const c = centroidByName.get(norm(r.municipality));
    if(!c){ miss++; missing.add(r.municipality); continue; }
    await client.query(`UPDATE political_assets SET lat=$1, lng=$2 WHERE id=$3`, [c.lat, c.lng, r.id]);
    ok++;
  }
  console.log(`Updated ${ok}, missed ${miss}`);
  if(missing.size) console.log('Missing cities sample:', [...missing].slice(0,30));
  await client.end();
};
main().catch(e=>{console.error(e); process.exit(1);});
