import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import type { DbCampaignMember } from '@/types/database';
import { toast } from 'sonner';

export function useCampaignMembers() {
  return useQuery({
    queryKey: ['campaign-members'],
    queryFn: async () => {
      const { data, error } = await db
        .from('campaign_members')
        .select('*')
        .order('hierarchy_level')
        .order('name');
      if (error) throw error;
      return (data ?? []) as DbCampaignMember[];
    },
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<DbCampaignMember, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await db
        .from('campaign_members')
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as DbCampaignMember;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members'] });
      toast.success('Membro cadastrado!');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DbCampaignMember> & { id: string }) => {
      const { error } = await db
        .from('campaign_members')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members'] });
      toast.success('Membro atualizado!');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('campaign_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-members'] });
      toast.success('Membro removido.');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}
