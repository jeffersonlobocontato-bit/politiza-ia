import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import type { DbAction, DbActionStatus } from '@/types/database';
import { toast } from 'sonner';

export function useActions() {
  return useQuery({
    queryKey: ['actions'],
    queryFn: async () => {
      const { data, error } = await db
        .from('actions')
        .select('*')
        .is('deleted_at', null)
        .order('planned_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbAction[];
    },
  });
}

export function useCreateAction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<DbAction, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      const { data, error } = await db
        .from('actions')
        .insert({ ...payload, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as DbAction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Ação cadastrada com sucesso!');
    },
    onError: (e: any) => toast.error(`Erro ao cadastrar: ${e.message}`),
  });
}

export function useUpdateActionStatus() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: DbActionStatus; note?: string }) => {
      // Get current status for history
      const { data: current } = await db.from('actions').select('status').eq('id', id).single();
      const { error } = await db
        .from('actions')
        .update({ status, updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      // Record history
      await db.from('action_history').insert({
        action_id: id,
        changed_by: user?.id ?? null,
        changed_by_name: profile?.full_name ?? user?.email ?? 'Sistema',
        old_status: (current as any)?.status ?? null,
        new_status: status,
        note: note ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Status atualizado!');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useUpdateAction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DbAction> & { id: string }) => {
      const { error } = await db
        .from('actions')
        .update({ ...patch, updated_by: user?.id } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Ação atualizada!');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeleteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('actions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Ação removida.');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}
