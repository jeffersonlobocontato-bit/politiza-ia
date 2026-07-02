// Paleta única usada em todos os mapas para colorir pins por TIPO/FUNÇÃO.
// Evita que toda a base "nativa" fique azul e perca leitura no mapa.

export type AssetFamily =
  | 'executivo'
  | 'legislativo'
  | 'candidato'
  | 'coordenacao'
  | 'lideranca'
  | 'evento'
  | 'acao'
  | 'pesquisa'
  | 'outros';

export const FAMILY_META: Record<AssetFamily, { label: string; order: number }> = {
  executivo:   { label: 'Executivo',              order: 1 },
  legislativo: { label: 'Legislativo',            order: 2 },
  candidato:   { label: 'Candidatos',             order: 3 },
  coordenacao: { label: 'Coordenação / Campanha', order: 4 },
  lideranca:   { label: 'Lideranças & Base',      order: 5 },
  evento:      { label: 'Eventos & Captação',     order: 6 },
  acao:        { label: 'Ações de Campo',         order: 7 },
  pesquisa:    { label: 'Pesquisas',              order: 8 },
  outros:      { label: 'Outros',                 order: 9 },
};

export interface TypeMeta {
  color: string;
  label: string;
  family: AssetFamily;
}

export const TYPE_COLORS: Record<string, TypeMeta> = {
  // Executivo
  prefeito:                { color: '#DAA520', label: 'Prefeito',                 family: 'executivo' },
  vice_prefeito:           { color: '#F97316', label: 'Vice-Prefeito',            family: 'executivo' },
  ex_prefeito:             { color: '#FCD34D', label: 'Ex-Prefeito',              family: 'executivo' },
  pretenso_prefeito:       { color: '#FB923C', label: 'Pretenso Prefeito',       family: 'executivo' },
  // Legislativo
  deputado_federal:        { color: '#6D28D9', label: 'Deputado Federal',         family: 'legislativo' },
  deputado_estadual:       { color: '#A855F7', label: 'Deputado Estadual',        family: 'legislativo' },
  vereador:                { color: '#C084FC', label: 'Vereador',                 family: 'legislativo' },
  ex_vereador:             { color: '#DDD6FE', label: 'Ex-Vereador',              family: 'legislativo' },
  pretenso_vereador:       { color: '#D8B4FE', label: 'Pretenso Vereador',       family: 'legislativo' },
  // Candidatos
  candidato:               { color: '#EC4899', label: 'Candidato (Majoritária)',  family: 'candidato' },
  // Coordenação
  coord_geral:             { color: '#14532D', label: 'Coord. Geral',             family: 'coordenacao' },
  coord_estadual:          { color: '#15803D', label: 'Coord. Estadual',          family: 'coordenacao' },
  coord_macro:             { color: '#22C55E', label: 'Coord. Macrorregional',   family: 'coordenacao' },
  coord_micro:             { color: '#4ADE80', label: 'Coord. Microrregional',   family: 'coordenacao' },
  coord_cidade:            { color: '#86EFAC', label: 'Coord. Municipal',         family: 'coordenacao' },
  coordenador_partidario:  { color: '#10B981', label: 'Coord. Partidário',        family: 'coordenacao' },
  // Lideranças
  presidente_entidade:     { color: '#0891B2', label: 'Presidente de Entidade',  family: 'lideranca' },
  lideranca_comunitaria:   { color: '#06B6D4', label: 'Liderança Comunitária',   family: 'lideranca' },
  lideranca_empresarial:   { color: '#0EA5E9', label: 'Liderança Empresarial',   family: 'lideranca' },
  lideranca_religiosa:     { color: '#22D3EE', label: 'Liderança Religiosa',     family: 'lideranca' },
  influenciador_regional:  { color: '#67E8F9', label: 'Influenciador Regional',  family: 'lideranca' },
  // Eventos
  publico_eventos:         { color: '#F59E0B', label: 'Público Eventos',          family: 'evento' },
  // Operacional
  acao_campo:              { color: '#1F5AB4', label: 'Ação de Campo',            family: 'acao' },
  ativacao_campo:          { color: '#C00000', label: 'Ativação / Panfletagem',   family: 'acao' },
  entrevista:              { color: '#0EA5E9', label: 'Entrevista',               family: 'pesquisa' },
};

export const DEFAULT_TYPE_META: TypeMeta = { color: '#94A3B8', label: 'Outros', family: 'outros' };

export function typeMeta(t: string | null | undefined): TypeMeta {
  if (!t) return DEFAULT_TYPE_META;
  return TYPE_COLORS[t] ?? DEFAULT_TYPE_META;
}

// Mapeia role textual de campaign_members para um type
export function roleToType(role: string | null | undefined): string {
  const k = (role || '').toLowerCase().trim();
  if (!k) return 'outros';
  if (TYPE_COLORS[k]) return k;
  if (k.includes('geral')) return 'coord_geral';
  if (k.includes('estad')) return 'coord_estadual';
  if (k.includes('macro') || k.includes('region')) return 'coord_macro';
  if (k.includes('micro')) return 'coord_micro';
  if (k.includes('municip') || k.includes('cidade')) return 'coord_cidade';
  if (k.includes('partid')) return 'coordenador_partidario';
  if (k.includes('coord')) return 'coord_macro';
  return 'outros';
}

// Resolve o tipo a partir de um GeoLead (qualquer source) para o mapa estratégico.
export function geoLeadType(source: string, raw: any): string {
  switch (source) {
    case 'assets':     return raw?.type || 'outros';
    case 'leaders':    return 'lideranca_comunitaria';
    case 'members':    return roleToType(raw?.role);
    case 'candidates': return 'candidato';
    case 'actions':    return raw?.type === 'ativacao_campo' ? 'ativacao_campo' : 'acao_campo';
    case 'interviews': return 'entrevista';
    case 'alerts':     return 'outros';
    default:           return 'outros';
  }
}
