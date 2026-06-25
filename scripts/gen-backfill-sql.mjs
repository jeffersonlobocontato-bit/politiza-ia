// Gera SQL UPDATE em lote para backfill — emite arquivo .sql.
import fs from 'fs';

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
  return best;
}

const names = await (await fetch(IBGE_NAMES)).json();
const codeToName = new Map(names.map(x => [String(x.id), x.nome]));
const geo = await (await fetch(IBGE_GEO)).json();

const rows = [];
for(const f of geo.features){
  const code = String(f.properties.codarea);
  const name = codeToName.get(code);
  if(!name) continue;
  const [lng,lat] = geometryCentroid(f.geometry);
  rows.push({ name, lat, lng });
}

const esc = s => s.replace(/'/g, "''");
const values = rows.map(r => `('${esc(norm(r.name))}',${r.lat},${r.lng})`).join(',\n');
const sql = `UPDATE public.political_assets pa
SET lat = c.lat, lng = c.lng
FROM (VALUES
${values}
) AS c(cname, lat, lng)
WHERE pa.deleted_at IS NULL
  AND (pa.lat IS NULL OR pa.lng IS NULL)
  AND pa.municipality IS NOT NULL
  AND lower(translate(pa.municipality, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ','AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')) = c.cname;`;
fs.writeFileSync('/tmp/backfill.sql', sql);
console.log('rows:', rows.length, 'sql size:', sql.length);
