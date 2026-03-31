// Tracking module domain types

export type TrackingRoundStatus = 'aberta' | 'fechada' | 'em_analise';
export type TrackingInsightType = 'performance' | 'eficiencia' | 'capilaridade' | 'oportunidade';
export type TrackingInsightStatus = 'novo' | 'visualizado' | 'em_analise' | 'resolvido';
export type TrackingAlertType = 'baixa_capilaridade' | 'queda_tracking' | 'oportunidade_expansao' | 'baixa_eficiencia' | 'indecisos_altos';

export interface DbTrackingRound {
  id: string;
  candidate_id: string;
  title: string;
  description: string | null;
  territory_scope: string;
  start_date: string;
  end_date: string | null;
  status: TrackingRoundStatus;
  target_interviews: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbTrackingInterview {
  id: string;
  round_id: string;
  interviewer_id: string;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  lat: number | null;
  lng: number | null;
  respondent_age_range: string | null;
  respondent_gender: string | null;
  respondent_income: string | null;
  respondent_education: string | null;
  created_at: string;
}

export interface DbTrackingInterviewAnswer {
  id: string;
  interview_id: string;
  question_key: string;
  answer_value: string;
  candidate_name: string | null;
  created_at: string;
}

export interface DbTrackingAiInsight {
  id: string;
  round_id: string;
  candidate_id: string;
  insight_type: TrackingInsightType;
  territory_scope: string | null;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  title: string;
  description: string | null;
  recommendation: string | null;
  severity: number;
  priority_score: number;
  capillarity_score: number;
  efficiency_score: number;
  source_data: any;
  status: TrackingInsightStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTrackingAiAlert {
  id: string;
  round_id: string;
  candidate_id: string;
  alert_type: TrackingAlertType;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  title: string;
  description: string | null;
  recommendation: string | null;
  severity: number;
  priority_score: number;
  status: TrackingInsightStatus;
  resolution_note: string | null;
  field_actions_count: number;
  tracking_variation: number;
  capillarity_index: number;
  generated_from: any;
  created_at: string;
  updated_at: string;
}

export const TRACKING_QUESTION_KEYS = [
  { key: 'intencao_voto_espontanea', label: 'Intenção de Voto (Espontânea)' },
  { key: 'intencao_voto_estimulada', label: 'Intenção de Voto (Estimulada)' },
  { key: 'rejeicao', label: 'Rejeição' },
  { key: 'conhecimento', label: 'Candidato Mais Conhecido' },
  { key: 'avaliacao_governo', label: 'Avaliação do Governo' },
] as const;

export const AGE_RANGES = ['16-24', '25-34', '35-44', '45-59', '60+'];
export const GENDERS = ['Masculino', 'Feminino', 'Outro'];
export const INCOME_RANGES = ['Até 1 SM', '1-3 SM', '3-5 SM', '5-10 SM', 'Acima de 10 SM'];
export const EDUCATION_LEVELS = ['Fundamental', 'Médio', 'Superior', 'Pós-graduação'];

export const ALERT_TYPE_LABELS: Record<TrackingAlertType, string> = {
  baixa_capilaridade: 'Baixa Capilaridade',
  queda_tracking: 'Queda no Tracking',
  oportunidade_expansao: 'Oportunidade de Expansão',
  baixa_eficiencia: 'Baixa Eficiência',
  indecisos_altos: 'Indecisos Altos',
};

export const INSIGHT_TYPE_LABELS: Record<TrackingInsightType, string> = {
  performance: 'Performance',
  eficiencia: 'Eficiência',
  capilaridade: 'Capilaridade',
  oportunidade: 'Oportunidade',
};
