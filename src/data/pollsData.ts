// ============================================================
// Typed data model for electoral research (pesquisas)
// Extracted from: PR_Mar26.pdf (Paraná Pesquisas, Março 2026)
//                 Pesquisa_estadual_mar2026.pdf (tabulação)
// ============================================================

export type Cargo = 'governador' | 'senador';
export type QuestionType = 'espontanea' | 'estimulada' | 'rejeicao' | 'aprovacao';
export type FilterType = 'genero' | 'faixa_etaria' | 'escolaridade' | 'renda' | 'religiosidade';

export interface CandidateResult {
  candidate: string;
  percentage: number;
  color?: string; // hex or hsl token
}

export interface CrossTabRow {
  label: string;
  values: Record<string, number>; // candidate → percentage
}

export interface CrossTab {
  filterType: FilterType;
  filterLabel: string;
  candidates: string[];
  rows: CrossTabRow[];
}

export interface PollQuestion {
  id: string;
  waveId: string;
  cargo: Cargo;
  questionType: QuestionType;
  scenarioLabel: string; // e.g. "Cenário 1", "RM*", "Espontânea"
  results: CandidateResult[];
  crossTabs: CrossTab[];
  note?: string; // e.g. "*Cada entrevistado poderia citar mais de 1 candidato"
}

export interface ComparativoRow {
  wave: string; // "Mar/25", "Mai/25", etc.
  values: Record<string, number>;
}

export interface PollComparativo {
  id: string;
  waveId: string;
  cargo: Cargo;
  questionType: QuestionType;
  scenarioLabel: string;
  candidates: string[];
  rows: ComparativoRow[];
}

export interface PollWave {
  id: string;
  institute: string;
  territory: string;
  cargos: Cargo[];
  collectionStart: string;
  collectionEnd: string;
  releaseDate: string;
  sampleSize: number;
  marginOfError: number;
  methodology: string;
  tseRegistration: string;
  fileName?: string;
}

// ────────────────────────────────────────────────────────────
// WAVE: PR Março 2026 — Paraná Pesquisas
// ────────────────────────────────────────────────────────────

export const pollWaves: PollWave[] = [
  {
    id: 'pr-mar26',
    institute: 'Paraná Pesquisas',
    territory: 'Estado do Paraná',
    cargos: ['governador', 'senador'],
    collectionStart: '01/03/2026',
    collectionEnd: '04/03/2026',
    releaseDate: '12/03/2026',
    sampleSize: 1500,
    marginOfError: 2.6,
    methodology: 'Entrevistas pessoais domiciliares e presenciais — 55 municípios — quotas por gênero, faixa etária, escolaridade e renda',
    tseRegistration: 'PR-06254/2026',
    fileName: 'PR_Mar26.pdf',
  },
];

// ────────────────────────────────────────────────────────────
// CANDIDATE COLORS (semantic: use CSS vars via inline style)
// ────────────────────────────────────────────────────────────

export const CANDIDATE_COLORS: Record<string, string> = {
  'Sergio Moro':      '#3b82f6',
  'Requião Filho':    '#ef4444',
  'Rafael Greca':     '#a855f7',
  'Alexandre Curi':   '#f59e0b',
  'Giacobo':          '#6366f1',
  'Guto Silva':       '#14b8a6',
  'Luiz França':      '#f97316',
  'Alvaro Dias':      '#3b82f6',
  'Gleisi Hoffmann':  '#ef4444',
  'Filipe Barros':    '#22c55e',
  'Cristina Graeml':  '#f59e0b',
  'Nenhum/Branco/Nulo': '#6b7280',
  'Não sabe/Não opinou': '#9ca3af',
  'Poderia votar em todos': '#34d399',
  'Outros': '#9ca3af',
};

// ────────────────────────────────────────────────────────────
// QUESTIONS — GOVERNADOR
// ────────────────────────────────────────────────────────────

export const pollQuestions: PollQuestion[] = [
  // ── GOVERNADOR ESPONTÂNEA ──
  {
    id: 'gov-esp',
    waveId: 'pr-mar26',
    cargo: 'governador',
    questionType: 'espontanea',
    scenarioLabel: 'Espontânea',
    results: [
      { candidate: 'Não sabe/ não opinou', percentage: 75.9 },
      { candidate: 'Ninguém/ Branco/ Nulo', percentage: 5.3 },
      { candidate: 'Sergio Moro', percentage: 5.9 },
      { candidate: 'Ratinho Junior', percentage: 5.3 },
      { candidate: 'Requião Filho', percentage: 2.7 },
      { candidate: 'Alexandre Curi', percentage: 1.7 },
      { candidate: 'Rafael Greca', percentage: 1.6 },
      { candidate: 'Guto Silva', percentage: 0.9 },
      { candidate: 'Outros nomes citados', percentage: 0.8 },
    ],
    crossTabs: [],
  },

  // ── GOVERNADOR ESTIMULADA CENÁRIO 1 ──
  {
    id: 'gov-est-c1',
    waveId: 'pr-mar26',
    cargo: 'governador',
    questionType: 'estimulada',
    scenarioLabel: 'Cenário 1',
    results: [
      { candidate: 'Sergio Moro', percentage: 44.0 },
      { candidate: 'Requião Filho', percentage: 23.1 },
      { candidate: 'Alexandre Curi', percentage: 11.3 },
      { candidate: 'Giacobo', percentage: 4.5 },
      { candidate: 'Guto Silva', percentage: 4.3 },
      { candidate: 'Luiz França', percentage: 0.9 },
      { candidate: 'Nenhum/ Branco/ Nulo', percentage: 7.1 },
      { candidate: 'Não sabe/ Não opinou', percentage: 4.9 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Alexandre Curi', 'Guto Silva'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 3.3, 'Nenhum/Branco/Nulo': 5.8, 'Sergio Moro': 50.4, 'Requião Filho': 19.0, 'Alexandre Curi': 11.3, 'Guto Silva': 4.0 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 6.4, 'Nenhum/Branco/Nulo': 8.3, 'Sergio Moro': 38.3, 'Requião Filho': 26.7, 'Alexandre Curi': 11.2, 'Guto Silva': 4.9 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Alexandre Curi', 'Guto Silva'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 4.8, 'Nenhum/Branco/Nulo': 7.8, 'Sergio Moro': 42.8, 'Requião Filho': 23.5, 'Alexandre Curi': 12.0, 'Guto Silva': 5.4 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 4.6, 'Nenhum/Branco/Nulo': 6.7, 'Sergio Moro': 42.3, 'Requião Filho': 27.8, 'Alexandre Curi': 10.2, 'Guto Silva': 3.2 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 4.9, 'Nenhum/Branco/Nulo': 8.1, 'Sergio Moro': 44.6, 'Requião Filho': 21.1, 'Alexandre Curi': 11.2, 'Guto Silva': 4.6 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 4.6, 'Nenhum/Branco/Nulo': 7.4, 'Sergio Moro': 44.2, 'Requião Filho': 22.3, 'Alexandre Curi': 12.0, 'Guto Silva': 4.1 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 5.6, 'Nenhum/Branco/Nulo': 6.1, 'Sergio Moro': 45.2, 'Requião Filho': 21.7, 'Alexandre Curi': 11.0, 'Guto Silva': 5.3 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Alexandre Curi', 'Guto Silva'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 4.4, 'Nenhum/Branco/Nulo': 6.7, 'Sergio Moro': 39.2, 'Requião Filho': 27.8, 'Alexandre Curi': 11.1, 'Guto Silva': 5.1 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 5.8, 'Nenhum/Branco/Nulo': 7.8, 'Sergio Moro': 46.3, 'Requião Filho': 20.1, 'Alexandre Curi': 10.8, 'Guto Silva': 5.0 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 4.1, 'Nenhum/Branco/Nulo': 6.4, 'Sergio Moro': 45.3, 'Requião Filho': 22.9, 'Alexandre Curi': 12.2, 'Guto Silva': 2.8 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Alexandre Curi', 'Guto Silva'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 4.4, 'Nenhum/Branco/Nulo': 7.2, 'Sergio Moro': 44.6, 'Requião Filho': 22.4, 'Alexandre Curi': 11.1, 'Guto Silva': 4.5 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 6.1, 'Nenhum/Branco/Nulo': 7.0, 'Sergio Moro': 42.7, 'Requião Filho': 24.6, 'Alexandre Curi': 11.5, 'Guto Silva': 4.4 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Alexandre Curi', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 5.0, 'Nenhum/Branco/Nulo': 7.0, 'Sergio Moro': 40.9, 'Requião Filho': 25.3, 'Alexandre Curi': 12.0, 'Guto Silva': 4.7, 'Luiz França': 1.3 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 4.9, 'Nenhum/Branco/Nulo': 7.2, 'Sergio Moro': 46.7, 'Requião Filho': 21.1, 'Alexandre Curi': 10.6, 'Guto Silva': 4.2, 'Luiz França': 0.5 } },
        ],
      },
    ],
  },

  // ── GOVERNADOR ESTIMULADA CENÁRIO 2 ──
  {
    id: 'gov-est-c2',
    waveId: 'pr-mar26',
    cargo: 'governador',
    questionType: 'estimulada',
    scenarioLabel: 'Cenário 2',
    results: [
      { candidate: 'Sergio Moro', percentage: 40.1 },
      { candidate: 'Requião Filho', percentage: 20.4 },
      { candidate: 'Rafael Greca', percentage: 19.1 },
      { candidate: 'Giacobo', percentage: 4.7 },
      { candidate: 'Guto Silva', percentage: 4.5 },
      { candidate: 'Luiz França', percentage: 0.7 },
      { candidate: 'Nenhum/ Branco/ Nulo', percentage: 5.7 },
      { candidate: 'Não sabe/ Não opinou', percentage: 4.7 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Rafael Greca', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 3.3, 'Nenhum/Branco/Nulo': 3.7, 'Sergio Moro': 46.7, 'Requião Filho': 16.8, 'Rafael Greca': 18.5, 'Giacobo': 4.7, 'Guto Silva': 5.8, 'Luiz França': 0.6 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 6.1, 'Nenhum/Branco/Nulo': 7.6, 'Sergio Moro': 34.3, 'Requião Filho': 23.6, 'Rafael Greca': 19.7, 'Giacobo': 4.7, 'Guto Silva': 3.4, 'Luiz França': 0.8 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Rafael Greca', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 4.8, 'Nenhum/Branco/Nulo': 6.0, 'Sergio Moro': 40.4, 'Requião Filho': 18.7, 'Rafael Greca': 18.1, 'Giacobo': 6.6, 'Guto Silva': 3.6, 'Luiz França': 1.8 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 4.2, 'Nenhum/Branco/Nulo': 6.7, 'Sergio Moro': 36.6, 'Requião Filho': 22.5, 'Rafael Greca': 20.8, 'Giacobo': 3.2, 'Guto Silva': 4.9, 'Luiz França': 1.1 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 5.3, 'Nenhum/Branco/Nulo': 6.7, 'Sergio Moro': 40.0, 'Requião Filho': 20.4, 'Rafael Greca': 16.5, 'Giacobo': 5.3, 'Guto Silva': 5.3, 'Luiz França': 0.7 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 4.1, 'Nenhum/Branco/Nulo': 5.4, 'Sergio Moro': 41.2, 'Requião Filho': 21.5, 'Rafael Greca': 19.2, 'Giacobo': 3.8, 'Guto Silva': 4.3, 'Luiz França': 0.5 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 5.3, 'Nenhum/Branco/Nulo': 4.5, 'Sergio Moro': 41.7, 'Requião Filho': 18.4, 'Rafael Greca': 20.3, 'Giacobo': 5.3, 'Guto Silva': 4.3, 'Luiz França': 0.0 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Rafael Greca', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 4.6, 'Nenhum/Branco/Nulo': 5.8, 'Sergio Moro': 34.3, 'Requião Filho': 23.0, 'Rafael Greca': 23.0, 'Giacobo': 4.6, 'Guto Silva': 4.4, 'Luiz França': 0.2 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 5.0, 'Nenhum/Branco/Nulo': 6.5, 'Sergio Moro': 42.3, 'Requião Filho': 18.5, 'Rafael Greca': 17.6, 'Giacobo': 5.5, 'Guto Silva': 3.3, 'Luiz França': 1.3 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 4.3, 'Nenhum/Branco/Nulo': 4.3, 'Sergio Moro': 42.7, 'Requião Filho': 20.9, 'Rafael Greca': 17.6, 'Giacobo': 3.3, 'Guto Silva': 6.9, 'Luiz França': 0.0 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Rafael Greca', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 4.6, 'Nenhum/Branco/Nulo': 5.9, 'Sergio Moro': 40.5, 'Requião Filho': 19.4, 'Rafael Greca': 18.8, 'Giacobo': 4.6, 'Guto Silva': 5.4, 'Luiz França': 0.8 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 5.0, 'Nenhum/Branco/Nulo': 5.4, 'Sergio Moro': 39.2, 'Requião Filho': 22.7, 'Rafael Greca': 19.8, 'Giacobo': 4.8, 'Guto Silva': 2.6, 'Luiz França': 0.4 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Rafael Greca', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 5.0, 'Nenhum/Branco/Nulo': 5.2, 'Sergio Moro': 36.5, 'Requião Filho': 21.6, 'Rafael Greca': 21.9, 'Giacobo': 4.7, 'Guto Silva': 4.0, 'Luiz França': 1.1 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 4.5, 'Nenhum/Branco/Nulo': 6.2, 'Sergio Moro': 43.3, 'Requião Filho': 19.4, 'Rafael Greca': 16.7, 'Giacobo': 4.6, 'Guto Silva': 5.0, 'Luiz França': 0.2 } },
        ],
      },
    ],
  },

  // ── GOVERNADOR ESTIMULADA CENÁRIO 3 ──
  {
    id: 'gov-est-c3',
    waveId: 'pr-mar26',
    cargo: 'governador',
    questionType: 'estimulada',
    scenarioLabel: 'Cenário 3',
    results: [
      { candidate: 'Sergio Moro', percentage: 47.0 },
      { candidate: 'Requião Filho', percentage: 26.0 },
      { candidate: 'Giacobo', percentage: 5.9 },
      { candidate: 'Guto Silva', percentage: 5.5 },
      { candidate: 'Luiz França', percentage: 1.3 },
      { candidate: 'Nenhum/ Branco/ Nulo', percentage: 8.2 },
      { candidate: 'Não sabe/ Não opinou', percentage: 6.0 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 4.1, 'Nenhum/Branco/Nulo': 6.8, 'Sergio Moro': 53.6, 'Requião Filho': 21.4, 'Giacobo': 5.9, 'Guto Silva': 6.9, 'Luiz França': 1.3 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 7.7, 'Nenhum/Branco/Nulo': 9.5, 'Sergio Moro': 41.1, 'Requião Filho': 30.1, 'Giacobo': 5.9, 'Guto Silva': 4.3, 'Luiz França': 1.4 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 6.6, 'Nenhum/Branco/Nulo': 7.8, 'Sergio Moro': 47.6, 'Requião Filho': 24.1, 'Giacobo': 8.4, 'Guto Silva': 3.6, 'Luiz França': 1.8 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 5.3, 'Nenhum/Branco/Nulo': 8.5, 'Sergio Moro': 45.1, 'Requião Filho': 29.6, 'Giacobo': 3.9, 'Guto Silva': 5.6, 'Luiz França': 2.1 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 5.6, 'Nenhum/Branco/Nulo': 8.4, 'Sergio Moro': 47.7, 'Requião Filho': 24.6, 'Giacobo': 6.7, 'Guto Silva': 6.0, 'Luiz França': 1.1 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 5.6, 'Nenhum/Branco/Nulo': 8.2, 'Sergio Moro': 47.1, 'Requião Filho': 26.3, 'Giacobo': 5.4, 'Guto Silva': 6.4, 'Luiz França': 1.0 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 7.0, 'Nenhum/Branco/Nulo': 8.0, 'Sergio Moro': 47.6, 'Requião Filho': 24.9, 'Giacobo': 6.4, 'Guto Silva': 5.1, 'Luiz França': 1.1 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 5.8, 'Nenhum/Branco/Nulo': 7.7, 'Sergio Moro': 41.8, 'Requião Filho': 32.3, 'Giacobo': 6.0, 'Guto Silva': 5.3, 'Luiz França': 1.2 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 6.2, 'Nenhum/Branco/Nulo': 8.7, 'Sergio Moro': 49.0, 'Requião Filho': 23.1, 'Giacobo': 6.7, 'Guto Silva': 4.4, 'Luiz França': 1.9 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 5.9, 'Nenhum/Branco/Nulo': 7.9, 'Sergio Moro': 49.4, 'Requião Filho': 24.2, 'Giacobo': 4.6, 'Guto Silva': 7.6, 'Luiz França': 0.5 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 5.4, 'Nenhum/Branco/Nulo': 8.5, 'Sergio Moro': 47.6, 'Requião Filho': 24.9, 'Giacobo': 5.9, 'Guto Silva': 6.3, 'Luiz França': 1.4 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 7.4, 'Nenhum/Branco/Nulo': 7.6, 'Sergio Moro': 45.5, 'Requião Filho': 28.5, 'Giacobo': 6.1, 'Guto Silva': 3.7, 'Luiz França': 1.1 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Sergio Moro', 'Requião Filho', 'Giacobo', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 5.9, 'Nenhum/Branco/Nulo': 8.2, 'Sergio Moro': 43.9, 'Requião Filho': 28.5, 'Giacobo': 6.4, 'Guto Silva': 5.0, 'Luiz França': 2.1 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 6.1, 'Nenhum/Branco/Nulo': 8.2, 'Sergio Moro': 49.7, 'Requião Filho': 23.8, 'Giacobo': 5.5, 'Guto Silva': 6.0, 'Luiz França': 0.6 } },
        ],
      },
    ],
  },

  // ── GOVERNADOR REJEIÇÃO ──
  {
    id: 'gov-rej',
    waveId: 'pr-mar26',
    cargo: 'governador',
    questionType: 'rejeicao',
    scenarioLabel: 'Rejeição RM*',
    note: '*Cada entrevistado poderia citar mais de 1 (um) candidato',
    results: [
      { candidate: 'Requião Filho', percentage: 33.7 },
      { candidate: 'Sergio Moro', percentage: 18.3 },
      { candidate: 'Rafael Greca', percentage: 13.3 },
      { candidate: 'Giacobo', percentage: 8.7 },
      { candidate: 'Alexandre Curi', percentage: 7.8 },
      { candidate: 'Guto Silva', percentage: 7.7 },
      { candidate: 'Luiz França', percentage: 6.7 },
      { candidate: 'Poderia votar em todos', percentage: 12.0 },
      { candidate: 'Não sabe/ Não opinou', percentage: 12.3 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Requião Filho', 'Sergio Moro', 'Rafael Greca', 'Giacobo', 'Alexandre Curi', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 10.3, 'Poderia votar em todos': 9.3, 'Requião Filho': 43.0, 'Sergio Moro': 17.0, 'Rafael Greca': 13.6, 'Giacobo': 8.2, 'Alexandre Curi': 8.5, 'Guto Silva': 7.8, 'Luiz França': 7.4 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 14.0, 'Poderia votar em todos': 14.4, 'Requião Filho': 25.5, 'Sergio Moro': 19.4, 'Rafael Greca': 13.0, 'Giacobo': 9.1, 'Alexandre Curi': 7.2, 'Guto Silva': 7.7, 'Luiz França': 6.1 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Requião Filho', 'Sergio Moro', 'Rafael Greca', 'Giacobo', 'Alexandre Curi', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 8.4, 'Poderia votar em todos': 12.0, 'Requião Filho': 31.3, 'Sergio Moro': 15.7, 'Rafael Greca': 11.4, 'Giacobo': 12.7, 'Alexandre Curi': 7.8, 'Guto Silva': 6.6, 'Luiz França': 4.8 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 9.5, 'Poderia votar em todos': 11.3, 'Requião Filho': 38.4, 'Sergio Moro': 16.5, 'Rafael Greca': 10.6, 'Giacobo': 6.7, 'Alexandre Curi': 8.5, 'Guto Silva': 7.7, 'Luiz França': 9.9 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 11.6, 'Poderia votar em todos': 8.4, 'Requião Filho': 36.1, 'Sergio Moro': 20.7, 'Rafael Greca': 11.2, 'Giacobo': 8.4, 'Alexandre Curi': 6.7, 'Guto Silva': 7.4, 'Luiz França': 4.9 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 14.6, 'Poderia votar em todos': 13.8, 'Requião Filho': 32.0, 'Sergio Moro': 17.9, 'Rafael Greca': 12.8, 'Giacobo': 8.4, 'Alexandre Curi': 6.6, 'Guto Silva': 8.2, 'Luiz França': 4.6 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 14.2, 'Poderia votar em todos': 13.4, 'Requião Filho': 31.3, 'Sergio Moro': 19.3, 'Rafael Greca': 18.2, 'Giacobo': 8.8, 'Alexandre Curi': 9.4, 'Guto Silva': 8.0, 'Luiz França': 8.6 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Requião Filho', 'Sergio Moro', 'Rafael Greca', 'Giacobo', 'Alexandre Curi', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 15.8, 'Poderia votar em todos': 14.6, 'Requião Filho': 26.2, 'Sergio Moro': 20.0, 'Rafael Greca': 15.8, 'Giacobo': 11.1, 'Alexandre Curi': 9.7, 'Guto Silva': 10.4, 'Luiz França': 10.7 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 13.2, 'Poderia votar em todos': 13.2, 'Requião Filho': 33.4, 'Sergio Moro': 14.9, 'Rafael Greca': 13.8, 'Giacobo': 7.1, 'Alexandre Curi': 7.1, 'Guto Silva': 6.7, 'Luiz França': 5.2 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 6.9, 'Poderia votar em todos': 7.1, 'Requião Filho': 42.5, 'Sergio Moro': 22.1, 'Rafael Greca': 9.7, 'Giacobo': 8.7, 'Alexandre Curi': 6.9, 'Guto Silva': 6.6, 'Luiz França': 4.8 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Requião Filho', 'Sergio Moro', 'Rafael Greca', 'Giacobo', 'Alexandre Curi', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 11.3, 'Poderia votar em todos': 10.5, 'Requião Filho': 35.4, 'Sergio Moro': 18.3, 'Rafael Greca': 11.5, 'Giacobo': 7.7, 'Alexandre Curi': 7.1, 'Guto Silva': 6.8, 'Luiz França': 5.8 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 14.4, 'Poderia votar em todos': 15.5, 'Requião Filho': 29.8, 'Sergio Moro': 18.3, 'Rafael Greca': 17.2, 'Giacobo': 10.9, 'Alexandre Curi': 9.4, 'Guto Silva': 9.8, 'Luiz França': 8.7 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Requião Filho', 'Sergio Moro', 'Rafael Greca', 'Giacobo', 'Alexandre Curi', 'Guto Silva', 'Luiz França'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 13.0, 'Poderia votar em todos': 10.9, 'Requião Filho': 31.6, 'Sergio Moro': 19.3, 'Rafael Greca': 13.9, 'Giacobo': 8.9, 'Alexandre Curi': 7.9, 'Guto Silva': 8.0, 'Luiz França': 6.4 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 11.6, 'Poderia votar em todos': 13.0, 'Requião Filho': 35.6, 'Sergio Moro': 17.4, 'Rafael Greca': 12.7, 'Giacobo': 8.5, 'Alexandre Curi': 7.7, 'Guto Silva': 7.5, 'Luiz França': 6.9 } },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // QUESTIONS — SENADOR
  // ────────────────────────────────────────────────────────────

  // ── SENADOR ESPONTÂNEA ──
  {
    id: 'sen-esp',
    waveId: 'pr-mar26',
    cargo: 'senador',
    questionType: 'espontanea',
    scenarioLabel: 'Espontânea',
    results: [
      { candidate: 'Não sabe/ não opinou', percentage: 86.9 },
      { candidate: 'Ninguém/ Branco/ Nulo', percentage: 5.9 },
      { candidate: 'Cristina Graeml', percentage: 1.2 },
      { candidate: 'Alexandre Curi', percentage: 1.1 },
      { candidate: 'Alvaro Dias', percentage: 0.9 },
      { candidate: 'Ratinho Junior', percentage: 0.9 },
      { candidate: 'Deltan Dallagnol', percentage: 0.7 },
      { candidate: 'Gleisi Hoffmann', percentage: 0.7 },
      { candidate: 'Filipe Barros', percentage: 0.1 },
      { candidate: 'Outros nomes citados', percentage: 1.7 },
    ],
    crossTabs: [],
  },

  // ── SENADOR ESTIMULADA CENÁRIO 1 ──
  {
    id: 'sen-est-c1',
    waveId: 'pr-mar26',
    cargo: 'senador',
    questionType: 'estimulada',
    scenarioLabel: 'Cenário 1',
    note: '*Em 2026 serão eleitos 2 Senadores — cada eleitor pode votar em dois',
    results: [
      { candidate: 'Alvaro Dias', percentage: 49.6 },
      { candidate: 'Alexandre Curi', percentage: 33.7 },
      { candidate: 'Gleisi Hoffmann', percentage: 24.1 },
      { candidate: 'Filipe Barros', percentage: 23.7 },
      { candidate: 'Cristina Graeml', percentage: 23.1 },
      { candidate: 'Nenhum/ Branco/ Nulo', percentage: 9.4 },
      { candidate: 'Não sabe/ Não opinou', percentage: 5.5 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alvaro Dias', 'Alexandre Curi', 'Gleisi Hoffmann', 'Filipe Barros', 'Cristina Graeml'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 4.5, 'Nenhum/Branco/Nulo': 9.2, 'Alvaro Dias': 49.1, 'Alexandre Curi': 34.8, 'Gleisi Hoffmann': 19.7, 'Filipe Barros': 29.8, 'Cristina Graeml': 24.8 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 6.3, 'Nenhum/Branco/Nulo': 9.6, 'Alvaro Dias': 50.1, 'Alexandre Curi': 32.7, 'Gleisi Hoffmann': 28.0, 'Filipe Barros': 18.3, 'Cristina Graeml': 21.6 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alvaro Dias', 'Alexandre Curi', 'Gleisi Hoffmann', 'Filipe Barros', 'Cristina Graeml'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 7.8, 'Nenhum/Branco/Nulo': 11.4, 'Alvaro Dias': 42.2, 'Alexandre Curi': 35.5, 'Gleisi Hoffmann': 21.7, 'Filipe Barros': 27.1, 'Cristina Graeml': 23.5 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 8.8, 'Nenhum/Branco/Nulo': 9.9, 'Alvaro Dias': 46.1, 'Alexandre Curi': 33.5, 'Gleisi Hoffmann': 25.7, 'Filipe Barros': 23.2, 'Cristina Graeml': 23.2 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 4.6, 'Nenhum/Branco/Nulo': 7.7, 'Alvaro Dias': 48.4, 'Alexandre Curi': 35.1, 'Gleisi Hoffmann': 22.8, 'Filipe Barros': 24.9, 'Cristina Graeml': 24.2 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 3.6, 'Nenhum/Branco/Nulo': 9.2, 'Alvaro Dias': 53.7, 'Alexandre Curi': 35.0, 'Gleisi Hoffmann': 24.3, 'Filipe Barros': 22.8, 'Cristina Graeml': 22.5 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 4.5, 'Nenhum/Branco/Nulo': 9.6, 'Alvaro Dias': 52.1, 'Alexandre Curi': 30.5, 'Gleisi Hoffmann': 24.6, 'Filipe Barros': 22.7, 'Cristina Graeml': 22.5 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alvaro Dias', 'Alexandre Curi', 'Gleisi Hoffmann', 'Filipe Barros', 'Cristina Graeml'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 5.8, 'Nenhum/Branco/Nulo': 9.3, 'Alvaro Dias': 54.5, 'Alexandre Curi': 29.7, 'Gleisi Hoffmann': 27.6, 'Filipe Barros': 20.6, 'Cristina Graeml': 21.6 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 4.9, 'Nenhum/Branco/Nulo': 8.1, 'Alvaro Dias': 51.9, 'Alexandre Curi': 35.4, 'Gleisi Hoffmann': 22.5, 'Filipe Barros': 25.3, 'Cristina Graeml': 24.3 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 6.1, 'Nenhum/Branco/Nulo': 11.7, 'Alvaro Dias': 40.2, 'Alexandre Curi': 35.1, 'Gleisi Hoffmann': 22.9, 'Filipe Barros': 24.4, 'Cristina Graeml': 22.6 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alvaro Dias', 'Alexandre Curi', 'Gleisi Hoffmann', 'Filipe Barros', 'Cristina Graeml'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 5.4, 'Nenhum/Branco/Nulo': 9.0, 'Alvaro Dias': 49.7, 'Alexandre Curi': 34.5, 'Gleisi Hoffmann': 23.4, 'Filipe Barros': 26.1, 'Cristina Graeml': 21.7 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 5.7, 'Nenhum/Branco/Nulo': 10.2, 'Alvaro Dias': 49.5, 'Alexandre Curi': 31.8, 'Gleisi Hoffmann': 25.5, 'Filipe Barros': 18.3, 'Cristina Graeml': 26.1 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alvaro Dias', 'Alexandre Curi', 'Gleisi Hoffmann', 'Filipe Barros', 'Cristina Graeml'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 5.6, 'Nenhum/Branco/Nulo': 8.6, 'Alvaro Dias': 50.6, 'Alexandre Curi': 30.6, 'Gleisi Hoffmann': 27.9, 'Filipe Barros': 22.0, 'Cristina Graeml': 23.7 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 5.4, 'Nenhum/Branco/Nulo': 10.1, 'Alvaro Dias': 48.7, 'Alexandre Curi': 36.3, 'Gleisi Hoffmann': 20.7, 'Filipe Barros': 25.2, 'Cristina Graeml': 22.5 } },
        ],
      },
    ],
  },

  // ── SENADOR ESTIMULADA CENÁRIO 2 ──
  {
    id: 'sen-est-c2',
    waveId: 'pr-mar26',
    cargo: 'senador',
    questionType: 'estimulada',
    scenarioLabel: 'Cenário 2',
    note: '*Em 2026 serão eleitos 2 Senadores — cada eleitor pode votar em dois',
    results: [
      { candidate: 'Alexandre Curi', percentage: 42.1 },
      { candidate: 'Filipe Barros', percentage: 34.7 },
      { candidate: 'Cristina Graeml', percentage: 28.9 },
      { candidate: 'Gleisi Hoffmann', percentage: 27.5 },
      { candidate: 'Nenhum/ Branco/ Nulo', percentage: 13.3 },
      { candidate: 'Não sabe/ Não opinou', percentage: 7.2 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alexandre Curi', 'Filipe Barros', 'Cristina Graeml', 'Gleisi Hoffmann'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 5.7, 'Nenhum/Branco/Nulo': 13.2, 'Alexandre Curi': 44.3, 'Filipe Barros': 41.7, 'Cristina Graeml': 29.6, 'Gleisi Hoffmann': 23.2 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 8.6, 'Nenhum/Branco/Nulo': 13.5, 'Alexandre Curi': 40.2, 'Filipe Barros': 28.5, 'Cristina Graeml': 28.2, 'Gleisi Hoffmann': 31.3 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alexandre Curi', 'Filipe Barros', 'Cristina Graeml', 'Gleisi Hoffmann'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 7.8, 'Nenhum/Branco/Nulo': 14.5, 'Alexandre Curi': 47.0, 'Filipe Barros': 38.0, 'Cristina Graeml': 31.9, 'Gleisi Hoffmann': 25.9 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 8.5, 'Nenhum/Branco/Nulo': 12.3, 'Alexandre Curi': 44.7, 'Filipe Barros': 32.7, 'Cristina Graeml': 28.5, 'Gleisi Hoffmann': 29.9 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 8.1, 'Nenhum/Branco/Nulo': 11.9, 'Alexandre Curi': 38.9, 'Filipe Barros': 36.5, 'Cristina Graeml': 28.4, 'Gleisi Hoffmann': 26.3 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 6.4, 'Nenhum/Branco/Nulo': 11.8, 'Alexandre Curi': 43.5, 'Filipe Barros': 34.3, 'Cristina Graeml': 28.9, 'Gleisi Hoffmann': 27.6 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 6.1, 'Nenhum/Branco/Nulo': 16.3, 'Alexandre Curi': 39.0, 'Filipe Barros': 34.0, 'Cristina Graeml': 28.1, 'Gleisi Hoffmann': 27.0 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alexandre Curi', 'Filipe Barros', 'Cristina Graeml', 'Gleisi Hoffmann'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 7.9, 'Nenhum/Branco/Nulo': 13.9, 'Alexandre Curi': 37.8, 'Filipe Barros': 31.6, 'Cristina Graeml': 27.6, 'Gleisi Hoffmann': 33.2 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 6.5, 'Nenhum/Branco/Nulo': 12.1, 'Alexandre Curi': 45.7, 'Filipe Barros': 38.5, 'Cristina Graeml': 30.0, 'Gleisi Hoffmann': 25.4 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 7.6, 'Nenhum/Branco/Nulo': 14.8, 'Alexandre Curi': 40.7, 'Filipe Barros': 31.8, 'Cristina Graeml': 28.2, 'Gleisi Hoffmann': 24.7 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alexandre Curi', 'Filipe Barros', 'Cristina Graeml', 'Gleisi Hoffmann'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 7.2, 'Nenhum/Branco/Nulo': 12.8, 'Alexandre Curi': 43.4, 'Filipe Barros': 36.7, 'Cristina Graeml': 27.8, 'Gleisi Hoffmann': 26.5 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 7.2, 'Nenhum/Branco/Nulo': 14.6, 'Alexandre Curi': 39.2, 'Filipe Barros': 30.3, 'Cristina Graeml': 31.4, 'Gleisi Hoffmann': 29.6 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Nenhum/Branco/Nulo', 'Alexandre Curi', 'Filipe Barros', 'Cristina Graeml', 'Gleisi Hoffmann'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 6.6, 'Nenhum/Branco/Nulo': 13.3, 'Alexandre Curi': 38.8, 'Filipe Barros': 34.3, 'Cristina Graeml': 29.3, 'Gleisi Hoffmann': 32.0 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 7.7, 'Nenhum/Branco/Nulo': 13.4, 'Alexandre Curi': 45.1, 'Filipe Barros': 35.1, 'Cristina Graeml': 28.5, 'Gleisi Hoffmann': 23.5 } },
        ],
      },
    ],
  },

  // ── SENADOR REJEIÇÃO ──
  {
    id: 'sen-rej',
    waveId: 'pr-mar26',
    cargo: 'senador',
    questionType: 'rejeicao',
    scenarioLabel: 'Rejeição RM*',
    note: '*Cada entrevistado poderia citar mais de 1 (um) candidato',
    results: [
      { candidate: 'Gleisi Hoffmann', percentage: 46.6 },
      { candidate: 'Alvaro Dias', percentage: 14.7 },
      { candidate: 'Cristina Graeml', percentage: 10.9 },
      { candidate: 'Filipe Barros', percentage: 10.8 },
      { candidate: 'Alexandre Curi', percentage: 8.9 },
      { candidate: 'Poderia votar em todos', percentage: 9.7 },
      { candidate: 'Não sabe/ Não opinou', percentage: 15.6 },
    ],
    crossTabs: [
      {
        filterType: 'genero',
        filterLabel: 'Gênero',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Gleisi Hoffmann', 'Alvaro Dias', 'Cristina Graeml', 'Filipe Barros', 'Alexandre Curi'],
        rows: [
          { label: 'Masculino', values: { 'Não sabe/Não opinou': 12.9, 'Poderia votar em todos': 7.9, 'Gleisi Hoffmann': 54.0, 'Alvaro Dias': 13.7, 'Cristina Graeml': 11.7, 'Filipe Barros': 11.6, 'Alexandre Curi': 8.6 } },
          { label: 'Feminino',  values: { 'Não sabe/Não opinou': 18.0, 'Poderia votar em todos': 11.2, 'Gleisi Hoffmann': 40.0, 'Alvaro Dias': 15.5, 'Cristina Graeml': 10.1, 'Filipe Barros': 10.1, 'Alexandre Curi': 9.2 } },
        ],
      },
      {
        filterType: 'faixa_etaria',
        filterLabel: 'Faixa Etária',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Gleisi Hoffmann', 'Alvaro Dias', 'Cristina Graeml', 'Filipe Barros', 'Alexandre Curi'],
        rows: [
          { label: 'De 16 a 24 anos', values: { 'Não sabe/Não opinou': 18.1, 'Poderia votar em todos': 6.0, 'Gleisi Hoffmann': 33.7, 'Alvaro Dias': 18.1, 'Cristina Graeml': 12.7, 'Filipe Barros': 12.0, 'Alexandre Curi': 9.0 } },
          { label: 'De 25 a 34 anos', values: { 'Não sabe/Não opinou': 11.3, 'Poderia votar em todos': 10.9, 'Gleisi Hoffmann': 47.2, 'Alvaro Dias': 14.8, 'Cristina Graeml': 10.9, 'Filipe Barros': 12.0, 'Alexandre Curi': 7.0 } },
          { label: 'De 35 a 44 anos', values: { 'Não sabe/Não opinou': 12.3, 'Poderia votar em todos': 9.8, 'Gleisi Hoffmann': 47.0, 'Alvaro Dias': 12.6, 'Cristina Graeml': 11.2, 'Filipe Barros': 10.5, 'Alexandre Curi': 8.4 } },
          { label: 'De 45 a 59 anos', values: { 'Não sabe/Não opinou': 16.6, 'Poderia votar em todos': 11.5, 'Gleisi Hoffmann': 49.4, 'Alvaro Dias': 13.0, 'Cristina Graeml': 10.2, 'Filipe Barros': 10.2, 'Alexandre Curi': 8.2 } },
          { label: '60 anos ou mais', values: { 'Não sabe/Não opinou': 19.3, 'Poderia votar em todos': 8.3, 'Gleisi Hoffmann': 48.7, 'Alvaro Dias': 16.3, 'Cristina Graeml': 10.4, 'Filipe Barros': 10.2, 'Alexandre Curi': 11.5 } },
        ],
      },
      {
        filterType: 'escolaridade',
        filterLabel: 'Escolaridade',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Gleisi Hoffmann', 'Alvaro Dias', 'Cristina Graeml', 'Filipe Barros', 'Alexandre Curi'],
        rows: [
          { label: 'Ensino Fundamental', values: { 'Não sabe/Não opinou': 23.2, 'Poderia votar em todos': 12.1, 'Gleisi Hoffmann': 36.2, 'Alvaro Dias': 15.8, 'Cristina Graeml': 12.1, 'Filipe Barros': 13.0, 'Alexandre Curi': 13.0 } },
          { label: 'Ensino Médio',       values: { 'Não sabe/Não opinou': 13.6, 'Poderia votar em todos': 9.2, 'Gleisi Hoffmann': 49.1, 'Alvaro Dias': 14.1, 'Cristina Graeml': 9.0, 'Filipe Barros': 9.5, 'Alexandre Curi': 7.2 } },
          { label: 'Ensino Superior',    values: { 'Não sabe/Não opinou': 10.7, 'Poderia votar em todos': 7.9, 'Gleisi Hoffmann': 53.7, 'Alvaro Dias': 14.5, 'Cristina Graeml': 12.7, 'Filipe Barros': 10.7, 'Alexandre Curi': 7.4 } },
        ],
      },
      {
        filterType: 'renda',
        filterLabel: 'Nível Econômico (PEA)',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Gleisi Hoffmann', 'Alvaro Dias', 'Cristina Graeml', 'Filipe Barros', 'Alexandre Curi'],
        rows: [
          { label: 'PEA',     values: { 'Não sabe/Não opinou': 14.4, 'Poderia votar em todos': 8.6, 'Gleisi Hoffmann': 48.6, 'Alvaro Dias': 13.6, 'Cristina Graeml': 10.3, 'Filipe Barros': 10.8, 'Alexandre Curi': 7.9 } },
          { label: 'Não PEA', values: { 'Não sabe/Não opinou': 18.3, 'Poderia votar em todos': 12.0, 'Gleisi Hoffmann': 42.0, 'Alvaro Dias': 17.0, 'Cristina Graeml': 12.2, 'Filipe Barros': 10.9, 'Alexandre Curi': 11.3 } },
        ],
      },
      {
        filterType: 'religiosidade',
        filterLabel: 'Participação Religiosa',
        candidates: ['Não sabe/Não opinou', 'Poderia votar em todos', 'Gleisi Hoffmann', 'Alvaro Dias', 'Cristina Graeml', 'Filipe Barros', 'Alexandre Curi'],
        rows: [
          { label: 'Não participou', values: { 'Não sabe/Não opinou': 16.7, 'Poderia votar em todos': 10.2, 'Gleisi Hoffmann': 40.2, 'Alvaro Dias': 14.7, 'Cristina Graeml': 11.9, 'Filipe Barros': 13.2, 'Alexandre Curi': 10.7 } },
          { label: 'Participou',     values: { 'Não sabe/Não opinou': 14.6, 'Poderia votar em todos': 9.2, 'Gleisi Hoffmann': 52.2, 'Alvaro Dias': 14.6, 'Cristina Graeml': 10.0, 'Filipe Barros': 8.7, 'Alexandre Curi': 7.4 } },
        ],
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// COMPARATIVOS
// ────────────────────────────────────────────────────────────

export const pollComparativos: PollComparativo[] = [
  // Senador Cenário 1 — Jan26 vs Mar26
  {
    id: 'comp-sen-c1',
    waveId: 'pr-mar26',
    cargo: 'senador',
    questionType: 'estimulada',
    scenarioLabel: 'Cenário 1 — Comparativo',
    candidates: ['Alvaro Dias', 'Alexandre Curi', 'Cristina Graeml', 'Filipe Barros', 'Gleisi Hoffmann'],
    rows: [
      { wave: 'Jan/26', values: { 'Alvaro Dias': 47.5, 'Alexandre Curi': 36.2, 'Cristina Graeml': 26.0, 'Filipe Barros': 23.0, 'Gleisi Hoffmann': 0 } },
      { wave: 'Mar/26', values: { 'Alvaro Dias': 49.6, 'Alexandre Curi': 33.7, 'Cristina Graeml': 23.1, 'Filipe Barros': 23.7, 'Gleisi Hoffmann': 24.1 } },
    ],
  },
  // Aprovação Ratinho Junior — 7 waves
  {
    id: 'comp-aprov',
    waveId: 'pr-mar26',
    cargo: 'governador',
    questionType: 'aprovacao',
    scenarioLabel: 'Aprovação — Ratinho Junior (Comparativo)',
    candidates: ['Ótima', 'Boa', 'Regular', 'Ruim', 'Péssima', 'Aprova', 'Desaprova'],
    rows: [
      { wave: 'Mar/25', values: { 'Ótima': 26.0, 'Boa': 43.2, 'Regular': 20.3, 'Ruim': 4.4, 'Péssima': 5.1, 'Aprova': 82.7, 'Desaprova': 14.8 } },
      { wave: 'Mai/25', values: { 'Ótima': 28.4, 'Boa': 37.6, 'Regular': 22.5, 'Ruim': 4.8, 'Péssima': 5.9, 'Aprova': 80.5, 'Desaprova': 16.5 } },
      { wave: 'Jul/25', values: { 'Ótima': 27.8, 'Boa': 39.2, 'Regular': 22.7, 'Ruim': 4.1, 'Péssima': 5.2, 'Aprova': 81.4, 'Desaprova': 15.1 } },
      { wave: 'Ago/25', values: { 'Ótima': 29.4, 'Boa': 42.0, 'Regular': 19.8, 'Ruim': 3.6, 'Péssima': 4.2, 'Aprova': 85.0, 'Desaprova': 11.6 } },
      { wave: 'Nov/25', values: { 'Ótima': 36.7, 'Boa': 37.3, 'Regular': 18.0, 'Ruim': 3.2, 'Péssima': 3.4, 'Aprova': 84.3, 'Desaprova': 12.5 } },
      { wave: 'Jan/26', values: { 'Ótima': 36.5, 'Boa': 38.3, 'Regular': 15.8, 'Ruim': 2.4, 'Péssima': 4.9, 'Aprova': 85.5, 'Desaprova': 11.5 } },
      { wave: 'Mar/26', values: { 'Ótima': 34.9, 'Boa': 36.0, 'Regular': 18.9, 'Ruim': 3.4, 'Péssima': 4.8, 'Aprova': 84.3, 'Desaprova': 12.8 } },
    ],
  },
];
