import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, fetchAllRows } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import type { DbPoliticalAsset } from '@/types/database';
import { toast } from 'sonner';

export function usePoliticalAssets() {
  return useQuery({
    queryKey: ['political-assets'],
    queryFn: async () => {
      // Paginado: o PostgREST corta em 1000 linhas e a base já passou desse total.
      const rows = await fetchAllRows<DbPoliticalAsset>(() =>
        db.from('political_assets').select('*').is('deleted_at', null).order('name'),
      );
      return rows;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<DbPoliticalAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      const { data, error } = await db
        .from('political_assets')
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as DbPoliticalAsset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['political-assets'] });
      qc.invalidateQueries({ queryKey: ['unified-political-assets'] });
      toast.success('Ativo político cadastrado!');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DbPoliticalAsset> & { id: string }) => {
      const { error } = await db
        .from('political_assets')
        .update({ ...patch, updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['political-assets'] });
      qc.invalidateQueries({ queryKey: ['unified-political-assets'] });
      toast.success('Ativo atualizado!');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('political_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['political-assets'] });
      toast.success('Ativo removido.');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}
