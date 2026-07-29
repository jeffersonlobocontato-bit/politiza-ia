// Ranking populacional das associações de municípios do Paraná.
// Fonte: IBGE (estimativa 1º/jul/2025), composição Politiza IA.

export interface AssociationRanking {
  rank: number;
  acronym: string;
  name: string;
  polo: string;
  municipalities: number;
  population2025: number;
  percentPr: number;        // % da população do Paraná (bruto)
  normalizedShare: number;  // participação normalizada entre as 19 associações
}

export const ASSOCIATIONS_RANKING_2025: AssociationRanking[] = [
  { rank: 1,  acronym: 'ASSOMEC',          name: 'Associação dos Municípios da Região Metropolitana de Curitiba', polo: 'Curitiba',           municipalities: 29, population2025: 3720170, percentPr: 31.29, normalizedShare: 29.95 },
  { rank: 2,  acronym: 'AMOP',             name: 'Associação dos Municípios do Oeste do Paraná',                   polo: 'Cascavel',           municipalities: 54, population2025: 1517214, percentPr: 12.76, normalizedShare: 12.21 },
  { rank: 3,  acronym: 'AMEPAR',           name: 'Associação dos Municípios do Médio Paranapanema',                polo: 'Londrina',           municipalities: 22, population2025: 1101050, percentPr: 9.26,  normalizedShare: 8.86 },
  { rank: 4,  acronym: 'AMUSEP',           name: 'Associação dos Municípios do Setentrião Paranaense',             polo: 'Maringá',            municipalities: 30, population2025: 909489,  percentPr: 7.65,  normalizedShare: 7.32 },
  { rank: 5,  acronym: 'AMCG',             name: 'Associação dos Municípios da Região dos Campos Gerais',          polo: 'Ponta Grossa',       municipalities: 19, population2025: 846448,  percentPr: 7.12,  normalizedShare: 6.81 },
  { rank: 6,  acronym: 'AMSOP',            name: 'Associação dos Municípios do Sudoeste do Paraná',                polo: 'Francisco Beltrão',  municipalities: 42, population2025: 689348,  percentPr: 5.80,  normalizedShare: 5.55 },
  { rank: 7,  acronym: 'AMSULEP',          name: 'Associação dos Municípios da Região Suleste do Paraná',          polo: 'Lapa',               municipalities: 10, population2025: 363094,  percentPr: 3.05,  normalizedShare: 2.92 },
  { rank: 8,  acronym: 'AMOCENTRO',        name: 'Associação dos Municípios do Centro do Paraná',                  polo: 'Pitanga',            municipalities: 17, population2025: 354473,  percentPr: 2.98,  normalizedShare: 2.85 },
  { rank: 9,  acronym: 'COMCAM',           name: 'Comunidade dos Municípios da Região de Campo Mourão',            polo: 'Campo Mourão',       municipalities: 25, population2025: 349296,  percentPr: 2.94,  normalizedShare: 2.81 },
  { rank: 10, acronym: 'AMUVI',            name: 'Associação dos Municípios do Vale do Ivaí',                      polo: 'Apucarana',          municipalities: 26, population2025: 341538,  percentPr: 2.87,  normalizedShare: 2.75 },
  { rank: 11, acronym: 'AMERIOS',          name: 'Associação dos Municípios da Região do Entre Rios',              polo: 'Umuarama',           municipalities: 23, population2025: 318555,  percentPr: 2.68,  normalizedShare: 2.56 },
  { rank: 12, acronym: 'AMLIPA',           name: 'Associação dos Municípios do Litoral do Paraná',                 polo: 'Paranaguá',          municipalities: 7,  population2025: 314886,  percentPr: 2.65,  normalizedShare: 2.53 },
  { rank: 13, acronym: 'AMUNORPI',         name: 'Associação dos Municípios do Norte Pioneiro',                    polo: 'Jacarezinho',        municipalities: 23, population2025: 313471,  percentPr: 2.64,  normalizedShare: 2.52 },
  { rank: 14, acronym: 'AMUNPAR',          name: 'Associação dos Municípios do Noroeste do Paraná',                polo: 'Paranavaí',          municipalities: 28, population2025: 279946,  percentPr: 2.35,  normalizedShare: 2.25 },
  { rank: 15, acronym: 'CANTUQUIRIGUAÇU',  name: 'Associação do Cantuquiriguaçu',                                  polo: 'Laranjeiras do Sul', municipalities: 19, population2025: 227493,  percentPr: 1.91,  normalizedShare: 1.83 },
  { rank: 16, acronym: 'AMCESPAR',         name: 'Associação dos Municípios do Centro Sul do Paraná',              polo: 'Irati',              municipalities: 10, population2025: 218890,  percentPr: 1.84,  normalizedShare: 1.76 },
  { rank: 17, acronym: 'AMUNOP',           name: 'Associação dos Municípios do Norte do Paraná',                   polo: 'Cornélio Procópio',  municipalities: 21, population2025: 215792,  percentPr: 1.81,  normalizedShare: 1.74 },
  { rank: 18, acronym: 'AMENORTE',         name: 'Associação dos Municípios do Médio Noroeste do Estado do Paraná', polo: 'Cianorte',          municipalities: 12, population2025: 176900,  percentPr: 1.49,  normalizedShare: 1.42 },
  { rank: 19, acronym: 'AMSULPAR',         name: 'Associação dos Municípios do Sul Paranaense',                    polo: 'União da Vitória',   municipalities: 9,  population2025: 164833,  percentPr: 1.39,  normalizedShare: 1.33 },
];

export const RANKING_TOTALS_2025 = {
  totalLinks: 426,
  totalPopulationLinks: 12422886,
  percentPrLinks: 104.48,
  note: '27 municípios estão vinculados a duas associações; por isso a soma associativa excede 100% do Paraná.',
  prPopulation: 11881600, // 12.422.886 / 1,04555 ≈ 11.881.600 (derivado para referência)
};

// Normaliza acrônimo para lookup (a base pode ter variações de acento/case).
function normAcronym(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

const BY_ACRONYM = new Map(
  ASSOCIATIONS_RANKING_2025.map((r) => [normAcronym(r.acronym), r]),
);

export function getRankingForAcronym(acronym: string): AssociationRanking | null {
  return BY_ACRONYM.get(normAcronym(acronym)) ?? null;
}

export function formatPopulation(n: number): string {
  return n.toLocaleString('pt-BR');
}
