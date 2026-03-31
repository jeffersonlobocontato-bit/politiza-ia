import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadershipProfile {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  level: 'local' | 'regional' | 'estadual';
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetLeadershipLink {
  id: string;
  asset_id: string;
  profile_id: string;
  created_at: string;
}

const QUERY_KEY = 'leadership-profiles';
const LINKS_KEY = 'asset-leadership-links';

export function useLeadershipProfiles(onlyActive = true) {
  return useQuery<LeadershipProfile[]>({
    queryKey: [QUERY_KEY, onlyActive],
    queryFn: async () => {
      let q = (supabase as any).from('leadership_profiles').select('*').order('name');
      if (onlyActive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssetLeadershipLinks(assetIds?: string[]) {
  return useQuery<AssetLeadershipLink[]>({
    queryKey: [LINKS_KEY, assetIds],
    queryFn: async () => {
      let q = (supabase as any).from('asset_leadership_profiles').select('*');
      if (assetIds?.length) q = q.in('asset_id', assetIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateLeadershipProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Omit<LeadershipProfile, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase as any).from('leadership_profiles').insert(profile).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateLeadershipProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadershipProfile> & { id: string }) => {
      const { data, error } = await (supabase as any).from('leadership_profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useSetAssetProfiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, profileIds }: { assetId: string; profileIds: string[] }) => {
      // Delete existing links
      await (supabase as any).from('asset_leadership_profiles').delete().eq('asset_id', assetId);
      // Insert new links
      if (profileIds.length > 0) {
        const rows = profileIds.map(pid => ({ asset_id: assetId, profile_id: pid }));
        const { error } = await (supabase as any).from('asset_leadership_profiles').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LINKS_KEY] }),
  });
}
