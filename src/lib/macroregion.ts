import { PR_CITY_TO_MACRO } from '@/data/prCityMacro';

/** Normaliza nome de cidade: minúsculo, sem acentos, sem espaços/pontuação. */
export function normalizeCityKey(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Retorna o id da macrorregião do município (ou null se desconhecido). */
export function macroregionFromCity(city?: string | null): string | null {
  if (!city) return null;
  return PR_CITY_TO_MACRO[normalizeCityKey(city)] ?? null;
}
