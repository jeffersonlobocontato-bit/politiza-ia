/**
 * Base de dados do Cruzamento Quali-Quanti (Moro).
 *
 * ⚠ STUB — este arquivo precisa ser SUBSTITUÍDO pelo conteúdo real
 * de `src/data/cruzamentoMoro.ts` (com todas as abas, insightsMarketing,
 * sintese, fontes e limitacoes). O shape abaixo é o mínimo compatível
 * para o componente renderizar sem quebrar até o arquivo real chegar.
 */

export interface AbaSegmento {
  id: string;
  label: string;
  media?: number;
  barras: { seg: string; v: number }[];
  tema: string;
  classificacao: 'agreement' | 'partial_agreement' | 'dissonance' | 'silence';
  classificacaoNota: string;
  leitura: string;
  gap: string;
  implicacao: string;
}

export interface CruzamentoMoroData {
  fontes: { quanti: string; quali: string };
  limitacoes: string[];
  abas: AbaSegmento[];
  insightsMarketing: {
    avisoMetodologico: string;
    mapaEnfase: { termo: string; peso: number; valencia: 'positiva' | 'negativa' | 'neutra' }[];
    obrigatorios: { tema: string; justificativa?: string; risco?: string; alvo: string }[];
    possiveis: { tema: string; justificativa?: string; risco?: string; alvo: string }[];
    irrelevantes: { tema: string; justificativa?: string; risco?: string; alvo: string }[];
  };
  sintese: {
    agreement: string[];
    partial_agreement: string[];
    dissonance: string[];
    silence: string[];
    recomendacoes: string[];
  };
}

export const DATA_CRUZAMENTO_MORO: CruzamentoMoroData = {
  fontes: {
    quanti: 'Pendente — substitua este stub pelo arquivo real de dados.',
    quali: 'Pendente — substitua este stub pelo arquivo real de dados.',
  },
  limitacoes: [
    'Arquivo de dados ainda não foi anexado. Este é um placeholder para permitir o build.',
  ],
  abas: [],
  insightsMarketing: {
    avisoMetodologico: 'Dados reais ainda não carregados.',
    mapaEnfase: [],
    obrigatorios: [],
    possiveis: [],
    irrelevantes: [],
  },
  sintese: {
    agreement: [],
    partial_agreement: [],
    dissonance: [],
    silence: [],
    recomendacoes: [],
  },
};
