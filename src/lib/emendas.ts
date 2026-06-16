// src/lib/emendas.ts
// Sistema de faixas de valor, cores e utilitários do módulo Emendas

export type EmendaStatus =
  | 'pago' | 'empenhado' | 'em_execucao' | 'em_analise'
  | 'minuta_aprovado' | 'pendente' | 'sem_processo';

export type EmendaTipo =
  | 'individual' | 'bancada' | 'politicas_publicas' | 'comissao';

export type EmendaFaixa =
  | 'f1_micro' | 'f2_pequena' | 'f3_media' | 'f4_relevante'
  | 'f5_alta' | 'f6_muito_alta' | 'f7_estrategica';

// ─── Faixas de valor ─────────────────────────────────────────────────────────
// Limites calibrados nos dados reais: mediana R$400k, P75 R$710k, P90 R$1,2M

export interface FaixaConfig {
  id: EmendaFaixa;
  label: string;
  labelCurto: string;
  min: number;
  max: number;        // Infinity para a última
  color: string;      // cor do pin/badge (hex)
  colorLight: string; // fundo claro para badge
  colorText: string;  // texto sobre fundo claro
}

export const FAIXAS: FaixaConfig[] = [
  {
    id: 'f1_micro',
    label: 'Micro (até R$ 100k)',
    labelCurto: 'até 100k',
    min: 0,
    max: 100_000,
    color: '#9FE1CB',
    colorLight: '#E1F5EE',
    colorText: '#085041',
  },
  {
    id: 'f2_pequena',
    label: 'Pequena (R$ 100k–200k)',
    labelCurto: '100k–200k',
    min: 100_000,
    max: 200_000,
    color: '#1D9E75',
    colorLight: '#E1F5EE',
    colorText: '#04342C',
  },
  {
    id: 'f3_media',
    label: 'Média (R$ 200k–500k)',
    labelCurto: '200k–500k',
    min: 200_000,
    max: 500_000,
    color: '#378ADD',
    colorLight: '#E6F1FB',
    colorText: '#042C53',
  },
  {
    id: 'f4_relevante',
    label: 'Relevante (R$ 500k–1M)',
    labelCurto: '500k–1M',
    min: 500_000,
    max: 1_000_000,
    color: '#7F77DD',
    colorLight: '#EEEDFE',
    colorText: '#26215C',
  },
  {
    id: 'f5_alta',
    label: 'Alta (R$ 1M–2M)',
    labelCurto: '1M–2M',
    min: 1_000_000,
    max: 2_000_000,
    color: '#BA7517',
    colorLight: '#FAEEDA',
    colorText: '#412402',
  },
  {
    id: 'f6_muito_alta',
    label: 'Muito Alta (R$ 2M–5M)',
    labelCurto: '2M–5M',
    min: 2_000_000,
    max: 5_000_000,
    color: '#E24B4A',
    colorLight: '#FCEBEB',
    colorText: '#501313',
  },
  {
    id: 'f7_estrategica',
    label: 'Estratégica (acima de R$ 5M)',
    labelCurto: '> 5M',
    min: 5_000_000,
    max: Infinity,
    color: '#A32D2D',
    colorLight: '#FCEBEB',
    colorText: '#501313',
  },
];

export function getFaixaByValor(valor: number): FaixaConfig {
  return FAIXAS.find(f => valor >= f.min && valor < f.max) ?? FAIXAS[0];
}

export function getFaixaById(id: EmendaFaixa): FaixaConfig {
  return FAIXAS.find(f => f.id === id) ?? FAIXAS[0];
}

// ─── Status ──────────────────────────────────────────────────────────────────

export interface StatusConfig {
  id: EmendaStatus;
  label: string;
  color: string;
  colorLight: string;
  colorText: string;
}

export const STATUS_CONFIG: Record<EmendaStatus, StatusConfig> = {
  pago: {
    id: 'pago',
    label: 'Pago',
    color: '#1D9E75',
    colorLight: '#E1F5EE',
    colorText: '#04342C',
  },
  empenhado: {
    id: 'empenhado',
    label: 'Empenhado',
    color: '#378ADD',
    colorLight: '#E6F1FB',
    colorText: '#042C53',
  },
  em_execucao: {
    id: 'em_execucao',
    label: 'Em execução',
    color: '#7F77DD',
    colorLight: '#EEEDFE',
    colorText: '#26215C',
  },
  em_analise: {
    id: 'em_analise',
    label: 'Em análise',
    color: '#BA7517',
    colorLight: '#FAEEDA',
    colorText: '#412402',
  },
  minuta_aprovado: {
    id: 'minuta_aprovado',
    label: 'Minuta / Aprovado',
    color: '#888780',
    colorLight: '#F1EFE8',
    colorText: '#2C2C2A',
  },
  pendente: {
    id: 'pendente',
    label: 'Pendente',
    color: '#E24B4A',
    colorLight: '#FCEBEB',
    colorText: '#501313',
  },
  sem_processo: {
    id: 'sem_processo',
    label: 'Sem processo',
    color: '#5F5E5A',
    colorLight: '#F1EFE8',
    colorText: '#2C2C2A',
  },
};

export const STATUS_OPTIONS = Object.values(STATUS_CONFIG);

// ─── Tipos de emenda ──────────────────────────────────────────────────────────

export const TIPO_LABELS: Record<EmendaTipo, string> = {
  individual:        'Individual',
  bancada:           'Bancada',
  politicas_publicas: 'Políticas Públicas',
  comissao:          'Comissão',
};

// ─── Normalização do status a partir do texto bruto da planilha ───────────────

export function normalizarStatus(raw: string): EmendaStatus {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('integralmente pago') || t.includes('integralmente paga') || t.includes('proposta integralmente paga')) return 'pago';
  if (t.includes('parcialmente pago') || t.includes('pagamento parcial') || t.includes('em pagamento')) return 'pago';
  if (t.includes('plano de trabalho aprovado') && t.includes('integralmente pa')) return 'pago';
  if (t.includes('convênio em execução') || t.includes('contrato de repasse em execução') || t.includes('em execução')) return 'em_execucao';
  if (t.includes('convênio assinado') || t.includes('contrato de repasse')) return 'em_execucao';
  if (t.includes('proposta empenhada') || t.includes('programação empenhada') || t.includes('recurso empenhado') || t.includes('programação aprovada e empenhada')) return 'empenhado';
  if (t.includes('em análise') || t.includes('analise') || t.includes('análise técnica') || t.includes('plano de trabalho em complementação') || t.includes('complementação')) return 'em_analise';
  if (t.includes('proposta/plano de trabalho aprovado') || t.includes('proposta aprovada') || t.includes('minuta de empenho')) return 'minuta_aprovado';
  if (t.includes('pendente') || t.includes('instrumento não formalizado') || t.includes('sem registro')) return 'pendente';
  if (t.includes('sem processo') || t.includes('nenhum registro')) return 'sem_processo';
  return 'sem_processo';
}

// ─── Formatação ───────────────────────────────────────────────────────────────

export function fmtBRL(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return 'R$ 0';
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(0)}k`;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtBRLFull(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Áreas temáticas ──────────────────────────────────────────────────────────

export const AREAS_TEMATICAS = [
  'Saúde',
  'Segurança Pública',
  'Assistência Social',
  'Educação',
  'Agricultura',
  'Ciência e Tecnologia',
  'Infraestrutura Urbana',
  'Empreendedorismo',
  'Turismo',
  'Defesa Nacional',
  'Direitos Humanos e da Cidadania',
  'Integração e do Desenvolvimento Regional',
  'Esporte',
  'Transferências Especiais',
];

export const AREA_COLORS: Record<string, string> = {
  'Saúde':                   '#E24B4A',
  'Segurança Pública':       '#378ADD',
  'Assistência Social':      '#1D9E75',
  'Educação':                '#7F77DD',
  'Agricultura':             '#639922',
  'Ciência e Tecnologia':    '#185FA5',
  'Infraestrutura Urbana':   '#888780',
  'Empreendedorismo':        '#BA7517',
  'Turismo':                 '#D4537E',
  'Defesa Nacional':         '#5F5E5A',
  'Direitos Humanos e da Cidadania': '#D85A30',
  'Integração e do Desenvolvimento Regional': '#0F6E56',
  'Esporte':                 '#EF9F27',
  'Transferências Especiais':'#534AB7',
};
