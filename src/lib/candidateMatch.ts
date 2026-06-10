import type { Candidate } from '@/contexts/CandidateContext';

/** Normalize candidate name: remove accents, parenthesized party suffix, lowercase, collapse spaces. */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if a raw poll-result name matches a master candidate (by canonical name or any alias). */
export function matchesCandidate(resultName: string, master: Pick<Candidate, 'name'> & { name_aliases?: string[] | null }): boolean {
  const n = normalizeName(resultName);
  if (!n) return false;
  if (n === normalizeName(master.name)) return true;
  const aliases = master.name_aliases ?? [];
  return aliases.some(a => normalizeName(a) === n);
}

/** Map cargo string (DB candidate.cargo) to the lowercase Cargo key used in surveys. */
export function cargoToSurveyKey(cargo: string): 'governador' | 'senador' | 'presidente' | 'prefeito' | 'vereador' | 'deputado_federal' | 'deputado_estadual' | null {
  const c = cargo.toLowerCase();
  if (c.includes('governador')) return 'governador';
  if (c.includes('senador')) return 'senador';
  if (c.includes('presidente')) return 'presidente';
  if (c.includes('prefeito')) return 'prefeito';
  if (c.includes('vereador')) return 'vereador';
  if (c.includes('federal')) return 'deputado_federal';
  if (c.includes('estadual')) return 'deputado_estadual';
  return null;
}
