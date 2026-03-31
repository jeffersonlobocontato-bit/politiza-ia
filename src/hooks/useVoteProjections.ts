import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/contexts/AuthContext';

export interface VoteProjection {
  id: string;
  candidate_id: string;
  leader_id: string;
  candidacy_type: string;
  neighborhood: string | null;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  optimistic: number;
  intermediate: number;
  pessimistic: number;
  justification: string | null;
  observations: string | null;
  projection_date: string;
  status: string;
  reliability_index: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VoteProjectionRevision {
  id: string;
  projection_id: string;
  prev_optimistic: number;
  prev_intermediate: number;
  prev_pessimistic: number;
  new_optimistic: number;
  new_intermediate: number;
  new_pessimistic: number;
  revision_reason: string | null;
  revised_by: string | null;
  revised_at: string;
}

const PROJECTIONS_KEY = 'vote-projections';
const REVISIONS_KEY = 'vote-projection-revisions';

export function useVoteProjections(filters?: {
  candidate_id?: string;
  leader_id?: string;
  macroregion_id?: string;
  municipality?: string;
  candidacy_type?: string;
  status?: string;
}) {
  return useQuery<VoteProjection[]>({
    queryKey: [PROJECTIONS_KEY, filters],
    queryFn: async () => {
      let q = (supabase as any).from('vote_projections').select('*').order('created_at', { ascending: false });
      if (filters?.candidate_id) q = q.eq('candidate_id', filters.candidate_id);
      if (filters?.leader_id) q = q.eq('leader_id', filters.leader_id);
      if (filters?.macroregion_id) q = q.eq('macroregion_id', filters.macroregion_id);
      if (filters?.municipality) q = q.eq('municipality', filters.municipality);
      if (filters?.candidacy_type) q = q.eq('candidacy_type', filters.candidacy_type);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVoteProjectionRevisions(projectionId: string | undefined) {
  return useQuery<VoteProjectionRevision[]>({
    queryKey: [REVISIONS_KEY, projectionId],
    enabled: !!projectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vote_projection_revisions').select('*')
        .eq('projection_id', projectionId)
        .order('revised_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateVoteProjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projection: Partial<VoteProjection>) => {
      const { data, error } = await (supabase as any)
        .from('vote_projections').insert(projection).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROJECTIONS_KEY] }),
  });
}

export function useUpdateVoteProjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, revisionReason, ...updates }: Partial<VoteProjection> & { id: string; revisionReason?: string }) => {
      // Get current values for revision log
      const { data: current } = await (supabase as any)
        .from('vote_projections').select('optimistic,intermediate,pessimistic').eq('id', id).single();

      if (current && (updates.optimistic !== undefined || updates.intermediate !== undefined || updates.pessimistic !== undefined)) {
        await (supabase as any).from('vote_projection_revisions').insert({
          projection_id: id,
          prev_optimistic: current.optimistic,
          prev_intermediate: current.intermediate,
          prev_pessimistic: current.pessimistic,
          new_optimistic: updates.optimistic ?? current.optimistic,
          new_intermediate: updates.intermediate ?? current.intermediate,
          new_pessimistic: updates.pessimistic ?? current.pessimistic,
          revision_reason: revisionReason || null,
        });
      }

      const { data, error } = await (supabase as any)
        .from('vote_projections').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTIONS_KEY] });
      qc.invalidateQueries({ queryKey: [REVISIONS_KEY] });
    },
  });
}

export function useProjectionStats(candidateId?: string) {
  const { data: projections } = useVoteProjections({
    candidate_id: candidateId,
    status: 'ativa',
  });

  const stats = {
    totalOptimistic: 0,
    totalIntermediate: 0,
    totalPessimistic: 0,
    leaderCount: 0,
    territoriesCount: 0,
    avgPerLeader: 0,
    byMacroregion: {} as Record<string, { optimistic: number; intermediate: number; pessimistic: number; count: number }>,
    byMunicipality: {} as Record<string, { optimistic: number; intermediate: number; pessimistic: number; count: number }>,
  };

  if (!projections) return stats;

  const territories = new Set<string>();
  
  projections.forEach(p => {
    stats.totalOptimistic += p.optimistic;
    stats.totalIntermediate += p.intermediate;
    stats.totalPessimistic += p.pessimistic;
    stats.leaderCount++;
    
    if (p.municipality) territories.add(p.municipality);

    const macro = p.macroregion_id || 'Sem região';
    if (!stats.byMacroregion[macro]) stats.byMacroregion[macro] = { optimistic: 0, intermediate: 0, pessimistic: 0, count: 0 };
    stats.byMacroregion[macro].optimistic += p.optimistic;
    stats.byMacroregion[macro].intermediate += p.intermediate;
    stats.byMacroregion[macro].pessimistic += p.pessimistic;
    stats.byMacroregion[macro].count++;

    const mun = p.municipality || 'Sem município';
    if (!stats.byMunicipality[mun]) stats.byMunicipality[mun] = { optimistic: 0, intermediate: 0, pessimistic: 0, count: 0 };
    stats.byMunicipality[mun].optimistic += p.optimistic;
    stats.byMunicipality[mun].intermediate += p.intermediate;
    stats.byMunicipality[mun].pessimistic += p.pessimistic;
    stats.byMunicipality[mun].count++;
  });

  stats.territoriesCount = territories.size;
  stats.avgPerLeader = stats.leaderCount > 0 ? Math.round(stats.totalIntermediate / stats.leaderCount) : 0;

  return stats;
}
