// Módulos disponíveis para permissionamento por usuário.
// A chave é a rota base (mesma usada em AppSidebar / RoleAwareLayout).

export interface ModuleDef {
  key: string;
  label: string;
}

export const ALL_MODULES: ModuleDef[] = [
  { key: '/',                    label: 'Sala de Guerra' },
  { key: '/mapa',                label: 'Mapa Estratégico' },
  { key: '/acoes',               label: 'Ações' },
  { key: '/agenda',              label: 'Agenda' },
  { key: '/malha-logistica',     label: 'Malha Logística' },
  { key: '/gestao',              label: 'Gestão de Equipe' },
  { key: '/campo',               label: 'Campo' },
  { key: '/meus-cadastros',      label: 'Meus Cadastros' },
  { key: '/ativos',              label: 'Ativos Políticos' },
  { key: '/due-diligence',       label: 'Due Diligence' },
  { key: '/pesquisas',           label: 'Inteligência' },
  { key: '/pesquisas/base',      label: 'Base de Pesquisas' },
  { key: '/emendas',             label: 'Emendas' },
  { key: '/proporcional',        label: 'Proporcional' },
  { key: '/tracking',            label: 'Tracking' },
  { key: '/sala-de-crise',       label: 'Sala de Crise' },
  { key: '/juridico',            label: 'Jurídico' },
  { key: '/territorios',         label: 'Territórios' },
  { key: '/municipios',          label: 'Municípios' },
  { key: '/hierarquia',          label: 'Hierarquia' },
  { key: '/produtividade',       label: 'Produtividade' },
  { key: '/eventos',             label: 'Eventos' },
  { key: '/configuracoes',       label: 'Configurações' },
];

// Papéis onde a lista de permissões customizáveis faz sentido (Nível 2
// e assessores administrativos). admin_master fica sempre livre; papéis
// operacionais N3-N6 usam o layout de Campo.
const CUSTOMIZABLE_ROLES: string[] = [
  'coordenador_geral',
  'coordenador_estadual',
  'gestor_estadual_novo',
  'gestor_estadual_pl',
  'auditor_hierarquia',
  'analista_inteligencia',
  'analista_pesquisa',
  'executivo_leitura',
  'gestor_operacional',
];

export function supportsCustomModules(role: string | null | undefined): boolean {
  return !!role && CUSTOMIZABLE_ROLES.includes(role);
}

// Verifica se uma rota está permitida dado o allowlist (nullish = sem restrição).
export function isModuleAllowed(pathname: string, allowed: string[] | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.some(key => (key === '/' ? pathname === '/' : pathname.startsWith(key)));
}
