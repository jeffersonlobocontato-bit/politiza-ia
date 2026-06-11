import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/contexts/AuthContext';

const KEY_ASSOC = 'cm-associations';
const KEY_MACRO = 'cm-macroregions';
const KEY_PROFILE = 'cm-leadership-profiles';

export function useMemberAssociations(memberId: string | undefined) {
  return useQuery<string[]>({
    queryKey: [KEY_ASSOC, memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_member_associations')
        .select('association_id')
        .eq('member_id', memberId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.association_id);
    },
  });
}

export function useMemberMacroregions(memberId: string | undefined) {
  return useQuery<string[]>({
    queryKey: [KEY_MACRO, memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_member_macroregions')
        .select('macroregion_id')
        .eq('member_id', memberId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.macroregion_id);
    },
  });
}

export function useMemberLeadershipProfiles(memberId: string | undefined) {
  return useQuery<string[]>({
    queryKey: [KEY_PROFILE, memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_member_leadership_profiles')
        .select('profile_id')
        .eq('member_id', memberId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.profile_id);
    },
  });
}

async function replaceLinks(table: string, memberId: string, column: string, ids: string[]) {
  await (supabase as any).from(table).delete().eq('member_id', memberId);
  if (ids.length === 0) return;
  const rows = ids.map(id => ({ member_id: memberId, [column]: id }));
  const { error } = await (supabase as any).from(table).insert(rows);
  if (error) throw error;
}

export function useSetMemberAssociations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ids }: { memberId: string; ids: string[] }) =>
      replaceLinks('campaign_member_associations', memberId, 'association_id', ids),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY_ASSOC, vars.memberId] }),
  });
}

export function useSetMemberMacroregions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ids }: { memberId: string; ids: string[] }) =>
      replaceLinks('campaign_member_macroregions', memberId, 'macroregion_id', ids),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY_MACRO, vars.memberId] }),
  });
}

export function useSetMemberLeadershipProfiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ids }: { memberId: string; ids: string[] }) =>
      replaceLinks('campaign_member_leadership_profiles', memberId, 'profile_id', ids),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY_PROFILE, vars.memberId] }),
  });
}

export function useMunicipalityAssociations() {
  return useQuery({
    queryKey: ['municipality-associations-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('municipality_associations')
        .select('id, acronym, name')
        .order('acronym');
      if (error) throw error;
      return (data ?? []) as { id: string; acronym: string; name: string }[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
