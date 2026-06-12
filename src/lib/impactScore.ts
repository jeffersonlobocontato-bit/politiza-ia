/**
 * Sistema de Pontuação de Impacto (0–100) para ações de campo.
 *
 * Combina:
 *  1. Faixa absoluta de pessoas impactadas (base_score)
 *  2. Proporção em relação à população do município (prop_factor)
 *
 * Justiça: uma ação que atinge 500 pessoas numa cidade de 3.000 hab
 * vale MAIS que 500 pessoas em uma cidade de 200.000 hab.
 */

export const POPULATION_FLOOR = 2000; // piso para evitar gaming em cidades minúsculas

/** Faixa base de pontos por quantidade absoluta de pessoas impactadas. */
export function calcBaseScore(people: number): number {
  if (!people || people <= 0) return 0;
  if (people >= 1000) return 100;
  if (people >= 500) return 92;
  if (people >= 300) return 85;
  if (people >= 100) return 75;
  if (people >= 50) return 65;
  if (people >= 20) return 50;
  if (people >= 10) return 35;
  if (people >= 5) return 20;
  return 10; // 1–4
}

/**
 * Score final (0–100) ajustado pela proporção da cidade.
 * @param people pessoas impactadas
 * @param population população do município (use 0/null se desconhecida)
 */
export function calcImpactScore(people: number, population: number | null | undefined): number {
  const base = calcBaseScore(people);
  if (base === 0) return 0;
  const pop = Math.max(population || 0, POPULATION_FLOOR);
  const reachRatio = people / pop;
  // Fator vai de 0,4 (alcance desprezível) a 1,0 (≥10% da cidade)
  const propFactor = 0.4 + 0.6 * Math.min(reachRatio * 10, 1);
  return Math.round(base * propFactor);
}

/** Cor da barra interpolando vermelho → amarelo → verde. */
export function scoreColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  // 0..50: red(#E11D48) -> yellow(#F59E0B)
  // 50..100: yellow -> green(#2FA85A)
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const hex = (r: number, g: number, b: number) =>
    `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  if (s <= 50) {
    const t = s / 50;
    return hex(lerp(0xe1, 0xf5, t), lerp(0x1d, 0x9e, t), lerp(0x48, 0x0b, t));
  }
  const t = (s - 50) / 50;
  return hex(lerp(0xf5, 0x2f, t), lerp(0x9e, 0xa8, t), lerp(0x0b, 0x5a, t));
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 65) return 'Muito Bom';
  if (score >= 45) return 'Bom';
  if (score >= 25) return 'Regular';
  if (score > 0) return 'Baixo';
  return 'Sem impacto';
}
