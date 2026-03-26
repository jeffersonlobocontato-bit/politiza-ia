// CampanhaOS — Domain types (separate from auto-generated Supabase types)

export type AppRole =
  | 'admin_master' | 'coordenador_geral' | 'coordenador_estadual'
  | 'coordenador_regional' | 'coordenador_microrregional' | 'coordenador_municipal'
  | 'lideranca_local' | 'operador_campo' | 'analista_inteligencia'
  | 'analista_pesquisa' | 'executivo_leitura';

export type DbActionStatus = 'prevista' | 'confirmada' | 'em_andamento' | 'realizada' | 'atrasada' | 'cancelada' | 'pendente_validacao';
export type DbActionType = 'reuniao_politica' | 'visita_institucional' | 'mobilizacao_comunitaria' | 'adesivacao' | 'panfletagem' | 'carreata' | 'evento_regional' | 'agenda_candidato' | 'reuniao_empresarios' | 'encontro_liderancas' | 'acao_digital';
export type DbPriorityLevel = 'critica' | 'alta' | 'media' | 'baixa';
export type DbAlignmentStatus = 'alinhado' | 'provavel' | 'neutro' | 'oposicao' | 'indefinido';
export type DbAssetType = 'prefeito' | 'ex_prefeito' | 'pretenso_prefeito' | 'vereador' | 'ex_vereador' | 'pretenso_vereador' | 'lideranca_comunitaria' | 'lideranca_empresarial' | 'lideranca_religiosa' | 'presidente_entidade' | 'influenciador_regional' | 'coordenador_partidario';
export type DbAlertLevel = 'critico' | 'atencao' | 'oportunidade' | 'info';
export type DbAlertStatus = 'novo' | 'em_analise' | 'resolvido';

export interface DbProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: AppRole;
  macroregion_id: string | null;
  microregion: string | null;
  municipality: string | null;
}

export interface DbMacroRegion {
  id: string;
  name: string;
  coordinator: string | null;
  municipalities_count: number;
  center_lat: number | null;
  center_lng: number | null;
  created_at: string;
}

export interface DbMunicipality {
  id: string;
  name: string;
  macroregion_id: string | null;
  microregion: string | null;
  lat: number;
  lng: number;
  population: number;
  electoral_voters: number;
  created_at: string;
}

export interface DbAction {
  id: string;
  title: string;
  type: DbActionType;
  category: string | null;
  description: string | null;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  responsible: string | null;
  team: string[];
  planned_date: string;
  planned_time: string | null;
  priority: DbPriorityLevel;
  target_audience: string | null;
  estimated_impact: number;
  status: DbActionStatus;
  observations: string | null;
  executed_date: string | null;
  executed_people_count: number | null;
  evidence_photos: string[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DbActionHistory {
  id: string;
  action_id: string;
  changed_by: string | null;
  changed_by_name: string | null;
  old_status: DbActionStatus | null;
  new_status: DbActionStatus | null;
  note: string | null;
  created_at: string;
}

export interface DbPoliticalAsset {
  id: string;
  name: string;
  type: DbAssetType;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  position: string | null;
  influence_level: number;
  alignment_status: DbAlignmentStatus;
  support_status: string | null;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
  observations: string | null;
  relationship_owner: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DbCampaignMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  hierarchy_level: number;
  macroregion_id: string | null;
  microregion: string | null;
  municipality: string | null;
  supervisor_id: string | null;
  actions_managed: number;
  completion_rate: number;
  status: string;
  observations: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DbElectoralSurvey {
  id: string;
  institute: string;
  collection_date: string;
  release_date: string;
  scope: string;
  territory: string;
  sample_size: number;
  margin_of_error: number;
  methodology: string | null;
  tse_registration: string | null;
  cargos: string[];
  observations: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DbSurveyQuestion {
  id: string;
  survey_id: string;
  cargo: string;
  scenario_label: string;
  question_text: string | null;
  created_at: string;
}

export interface DbSurveyResult {
  id: string;
  question_id: string;
  candidate_name: string;
  percentage: number;
  is_excluded: boolean;
  created_at: string;
}

export interface HierarchyNode {
  name: string;
  role: string;
  level: number;
}

export interface DbAlert {
  id: string;
  level: DbAlertLevel;
  title: string;
  description: string | null;
  territory: string | null;
  macroregion_id: string | null;
  recommendation: string | null;
  status: DbAlertStatus;
  severity: number;
  is_auto_generated: boolean;
  is_read: boolean;
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
  resolution_note: string | null;
  responsible_name: string | null;
  responsible_role: string | null;
  hierarchy_chain: HierarchyNode[] | null;
}

export interface DashboardKPIs {
  total_actions: number;
  completed_actions: number;
  delayed_actions: number;
  in_progress_actions: number;
  pending_validation: number;
  total_people_impacted: number;
  completion_rate: number;
}

// Role label mapping
export const ROLE_LABELS: Record<AppRole, string> = {
  admin_master: 'Administrador Master',
  coordenador_geral: 'Coordenador Geral',
  coordenador_estadual: 'Coordenador Estadual',
  coordenador_regional: 'Coordenador Regional',
  coordenador_microrregional: 'Coordenador Microrregional',
  coordenador_municipal: 'Coordenador Municipal',
  lideranca_local: 'Liderança Local',
  operador_campo: 'Operador de Campo',
  analista_inteligencia: 'Analista de Inteligência',
  analista_pesquisa: 'Analista de Pesquisa',
  executivo_leitura: 'Executivo (Leitura)',
};

export const ADMIN_ROLES: AppRole[] = ['admin_master', 'coordenador_geral', 'coordenador_estadual'];
