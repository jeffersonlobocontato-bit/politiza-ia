import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'bloqueado' | 'concluido';
export type TaskArea = 'central' | 'regional' | 'partidario';
export type TaskPriority = 'urgente' | 'alta' | 'normal' | 'baixa';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  area: TaskArea;
  assigned_to: string | null;
  assigned_name: string | null;
  due_date: string | null;
  candidate_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  area?: TaskArea;
  assigned_to?: string | null;
  assigned_name?: string | null;
  due_date?: string | null;
  candidate_id?: string | null; // admin master pode escolher
}

const TABLE = 'tasks' as const;

/** Escopo: 'active' = candidatos selecionados; 'all' = todos visíveis; uuid = candidato específico */
export type TaskScope = string | 'active' | 'all';

function resolveCandidateIds(scope: TaskScope, selectedIds: string[], isViewingAll: boolean): string[] | null {
  if (scope === 'all') return null;
  if (scope === 'active') return isViewingAll ? null : selectedIds;
  return [scope];
}

export function useTasks(scope: TaskScope = 'active') {
  const { selectedCandidateIds, isViewingAll } = useCandidate();
  const candidateIds = resolveCandidateIds(scope, selectedCandidateIds, isViewingAll);

  return useQuery({
    queryKey: ['tasks', scope, candidateIds],
    queryFn: async () => {
      let q = (supabase as any)
        .from(TABLE)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (candidateIds?.length === 1) q = q.eq('candidate_id', candidateIds[0]);
      else if (candidateIds && candidateIds.length > 1) q = q.in('candidate_id', candidateIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: 30_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { activeCandidate } = useCandidate();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const payload = {
        ...input,
        candidate_id: input.candidate_id ?? activeCandidate?.id ?? null,
        created_by: user.id,
      };
      const { data, error } = await (supabase as any)
        .from(TABLE).insert(payload).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await (supabase as any).from(TABLE).update({ status }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      snapshots.forEach(([key, old]) => {
        if (!old) return;
        qc.setQueryData<Task[]>(key, old.map(t => t.id === id ? { ...t, status } : t));
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
