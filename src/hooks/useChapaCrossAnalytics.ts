import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllPartySlates, type SlateCandidate, type SlateParty } from './usePartySlate';

export type Scenario = 'bom' | 'medio' | 'ruim';

export const SCENARIO_LABEL: Record<Scenario, string> = {
  bom: 'Bom',
  medio: 'Médio',
  ruim: 'Ruim',
};

/** Mapeia cenário do banco (vote_projections) → cenário UI (Bom/Médio/Ruim). */
const PROJ_FIELD: Record<Scenario, 'optimistic' | 'intermediate' | 'pessimistic'> = {
  bom: 'optimistic',
  medio: 'intermediate',
  ruim: 'pessimistic',
};

export const slateVote = (r: SlateCandidate, s: Scenario): number =>
  s === 'bom' ? (r.votes_bom ?? 0) : s === 'medio' ? (r.votes_medio ?? 0) : (r.votes_ruim ?? 0);

const normalize = (s: string | null | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

interface ProjectionAgg {
  optimistic: number;
  intermediate: number;
  pessimistic: number;
  leaderIds: Set<string>;
  municipalities: Set<string>;
  reliability: { alta: number; media: number; baixa: number };
  rows: number;
}

const emptyAgg = (): ProjectionAgg => ({
  optimistic: 0,
  intermediate: 0,
  pessimistic: 0,
  leaderIds: new Set(),
  municipalities: new Set(),
  reliability: { alta: 0, media: 0, baixa: 0 },
  rows: 0,
});

export interface SlateCrossRow {
  slate: SlateCandidate;
  candidateId: string | null;
  matchedByName: boolean;
  /** Soma das projeções de lideranças (por cenário) — base. */
  computed: { bom: number; medio: number; ruim: number };
  declared: { bom: number; medio: number; ruim: number };
  leaderCount: number;
  municipalityCount: number;
  reliabilityScore: number; // 0..1 (alta=1, media=0.5, baixa=0)
  reliabilityLabel: 'alta' | 'media' | 'baixa' | null;
  rows: number;
}

/**
 * Cruza chapas × candidatos × vote_projections.
 * - Vínculo prioritário via `party_slate_candidates.candidate_id`.
 * - Fallback: casamento por nome normalizado.
 */
export function useChapaCrossAnalytics() {
  const { data: slate = [], isLoading: loadingSlate } = useAllPartySlates();

  const { data: candidates = [], isLoading: loadingCand } = useQuery({
    queryKey: ['candidates', 'cross-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('candidates')
        .select('id, name, party, cargo, photo_url')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; party: string | null; cargo: string | null; photo_url: string | null }>;
    },
  });

  const { data: projections = [], isLoading: loadingProj } = useQuery({
    queryKey: ['vote_projections', 'cross-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vote_projections')
        .select('candidate_id, leader_id, municipality, optimistic, intermediate, pessimistic, reliability_index, status')
        .is('deleted_at', null)
        .eq('status', 'ativa');
      if (error) throw error;
      return (data ?? []) as Array<{
        candidate_id: string;
        leader_id: string;
        municipality: string | null;
        optimistic: number;
        intermediate: number;
        pessimistic: number;
        reliability_index: 'alta' | 'media' | 'baixa' | null;
      }>;
    },
  });

  const aggByCandidate = useMemo(() => {
    const m: Record<string, ProjectionAgg> = {};
    for (const p of projections) {
      if (!m[p.candidate_id]) m[p.candidate_id] = emptyAgg();
      const a = m[p.candidate_id];
      a.optimistic += p.optimistic;
      a.intermediate += p.intermediate;
      a.pessimistic += p.pessimistic;
      a.leaderIds.add(p.leader_id);
      if (p.municipality) a.municipalities.add(p.municipality);
      const r = (p.reliability_index ?? 'media') as keyof ProjectionAgg['reliability'];
      if (a.reliability[r] !== undefined) a.reliability[r]++;
      a.rows++;
    }
    return m;
  }, [projections]);

  const candidateByNorm = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of candidates) m[normalize(c.name)] = c.id;
    return m;
  }, [candidates]);

  const rows: SlateCrossRow[] = useMemo(() => {
    return slate.map((s) => {
      let candidateId: string | null = s.candidate_id ?? null;
      let matchedByName = false;
      if (!candidateId) {
        const matched = candidateByNorm[normalize(s.name)];
        if (matched) {
          candidateId = matched;
          matchedByName = true;
        }
      }
      const agg = candidateId ? aggByCandidate[candidateId] ?? emptyAgg() : emptyAgg();
      const total = agg.reliability.alta + agg.reliability.media + agg.reliability.baixa;
      const reliabilityScore =
        total === 0 ? 0 : (agg.reliability.alta * 1 + agg.reliability.media * 0.5) / total;
      let reliabilityLabel: SlateCrossRow['reliabilityLabel'] = null;
      if (total > 0) {
        reliabilityLabel = reliabilityScore >= 0.7 ? 'alta' : reliabilityScore >= 0.4 ? 'media' : 'baixa';
      }
      return {
        slate: s,
        candidateId,
        matchedByName,
        computed: { bom: agg.optimistic, medio: agg.intermediate, ruim: agg.pessimistic },
        declared: { bom: s.votes_bom ?? 0, medio: s.votes_medio ?? 0, ruim: s.votes_ruim ?? 0 },
        leaderCount: agg.leaderIds.size,
        municipalityCount: agg.municipalities.size,
        reliabilityScore,
        reliabilityLabel,
        rows: agg.rows,
      };
    });
  }, [slate, candidateByNorm, aggByCandidate]);

  const byParty = useMemo(() => {
    const m: Record<SlateParty, SlateCrossRow[]> = { PL: [], Novo: [] };
    for (const r of rows) m[r.slate.party].push(r);
    return m;
  }, [rows]);

  return {
    rows,
    byParty,
    candidates,
    isLoading: loadingSlate || loadingCand || loadingProj,
  };
}
