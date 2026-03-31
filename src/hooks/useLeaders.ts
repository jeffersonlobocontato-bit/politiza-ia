import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/contexts/AuthContext';

export interface Leader {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  status: string;
  observations: string | null;
  neighborhood: string | null;
  municipality: string | null;
  microregion: string | null;
  macroregion_id: string | null;
  secondary_territories: any;
  coverage_type: string;
  candidate_id: string | null;
  coordinator_id: string | null;
  entry_date: string | null;
  support_status: string | null;
  alignment_status: string | null;
  relationship_owner: string | null;
  influence_level: number;
  mobilization_capacity: number;
  estimated_supporters: number;
  local_reputation: number;
  political_reliability: number;
  current_party: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface LeaderPoliticalHistory {
  id: string;
  leader_id: string;
  was_neighborhood_president: boolean;
  was_councilperson: boolean;
  was_candidate: boolean;
  positions_disputed: string[];
  times_candidate: number;
  held_mandate: boolean;
  mandate_count: number;
  positions_held: string[];
  election_years: string[];
  electoral_performance: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderPartyHistory {
  id: string;
  leader_id: string;
  party_name: string;
  start_year: number | null;
  end_year: number | null;
  observations: string | null;
  created_at: string;
}

const LEADERS_KEY = 'leaders';
const POLITICAL_HISTORY_KEY = 'leader-political-history';
const PARTY_HISTORY_KEY = 'leader-party-history';
const LEADER_PROFILES_KEY = 'leader-leadership-profiles';

export function useLeaders(filters?: { macroregion_id?: string; municipality?: string; status?: string }) {
  return useQuery<Leader[]>({
    queryKey: [LEADERS_KEY, filters],
    queryFn: async () => {
      let q = (supabase as any).from('leaders').select('*').order('name');
      if (filters?.macroregion_id) q = q.eq('macroregion_id', filters.macroregion_id);
      if (filters?.municipality) q = q.eq('municipality', filters.municipality);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeader(id: string | undefined) {
  return useQuery<Leader>({
    queryKey: [LEADERS_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('leaders').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaderPoliticalHistory(leaderId: string | undefined) {
  return useQuery<LeaderPoliticalHistory | null>({
    queryKey: [POLITICAL_HISTORY_KEY, leaderId],
    enabled: !!leaderId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leader_political_history').select('*').eq('leader_id', leaderId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaderPartyHistory(leaderId: string | undefined) {
  return useQuery<LeaderPartyHistory[]>({
    queryKey: [PARTY_HISTORY_KEY, leaderId],
    enabled: !!leaderId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leader_party_history').select('*').eq('leader_id', leaderId).order('start_year', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeaderProfiles(leaderId: string | undefined) {
  return useQuery<string[]>({
    queryKey: [LEADER_PROFILES_KEY, leaderId],
    enabled: !!leaderId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leader_leadership_profiles').select('profile_id').eq('leader_id', leaderId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.profile_id);
    },
  });
}

export function useCreateLeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leader: Partial<Leader>) => {
      const { data, error } = await (supabase as any).from('leaders').insert(leader).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADERS_KEY] }),
  });
}

export function useUpdateLeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Leader> & { id: string }) => {
      const { data, error } = await (supabase as any).from('leaders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADERS_KEY] }),
  });
}

export function useSaveLeaderPoliticalHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (history: Partial<LeaderPoliticalHistory> & { leader_id: string }) => {
      // Upsert: check if exists
      const { data: existing } = await (supabase as any)
        .from('leader_political_history').select('id').eq('leader_id', history.leader_id).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any)
          .from('leader_political_history').update(history).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('leader_political_history').insert(history);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [POLITICAL_HISTORY_KEY] }),
  });
}

export function useAddLeaderPartyHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<LeaderPartyHistory, 'id' | 'created_at'>) => {
      const { error } = await (supabase as any).from('leader_party_history').insert(entry);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARTY_HISTORY_KEY] }),
  });
}

export function useDeleteLeaderPartyHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('leader_party_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARTY_HISTORY_KEY] }),
  });
}

export function useSetLeaderProfiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leaderId, profileIds }: { leaderId: string; profileIds: string[] }) => {
      await (supabase as any).from('leader_leadership_profiles').delete().eq('leader_id', leaderId);
      if (profileIds.length > 0) {
        const rows = profileIds.map(pid => ({ leader_id: leaderId, profile_id: pid }));
        const { error } = await (supabase as any).from('leader_leadership_profiles').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADER_PROFILES_KEY] }),
  });
}
