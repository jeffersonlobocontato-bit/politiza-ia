// Utilitário para gerar slug amigável de evento.
// Formato: {cidade-normalizada}{DD-MM-AAAA}
// Ex: "Curitiba" + 2026-12-25 → "curitiba25-12-2026"
//     "São José dos Pinhais" + 2027-01-10 → "sao-jose-dos-pinhais10-01-2027"

export function slugifyCidade(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatarDataSlug(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function gerarSlugEvento(cidade: string | null | undefined, dataInicioIso: string, fallbackTitulo?: string): string {
  const base = slugifyCidade(cidade || fallbackTitulo || 'evento') || 'evento';
  return `${base}${formatarDataSlug(dataInicioIso)}`;
}

// Lista de rotas reservadas do app — slugs de evento não podem colidir.
export const RESERVED_ROUTES = new Set<string>([
  'login', 'forgot-password', 'reset-password',
  'e', 'eventos', 'mapa', 'territorios', 'municipios', 'acoes',
  'campo', 'juridico', 'ativos', 'pesquisas', 'hierarquia',
  'configuracoes', 'sala-de-crise', 'proporcional', 'tracking',
  'agenda', 'chapas', 'produtividade', 'gestao', 'emendas',
  'mobnex', 'alertas', 'inteligencia',
]);
