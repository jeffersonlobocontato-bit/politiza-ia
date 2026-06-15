import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import type { TaskScope } from './useTasks';

export interface DailyCheckin {
  id: string;
  user_id: string;
  user_name: string | null;
  checkin_date: string;
  delivered: string;
  planned: string;
  blocked: string | null;
  candidate_id: string | null;
  created_at: string;
}

const TABLE = 'daily_checkins' as const;

function resolveCandidateId(scope: TaskScope, activeId: string | null): string | null {
  if (scope === 'all') return null;
  if (scope === 'active') return activeId;
  return scope;
}

export function useTodayCheckins(scope: TaskScope = 'active') {
  const { activeCandidate } = useCandidate();
  const candidateId = resolveCandidateId(scope, activeCandidate?.id ?? null);
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['checkins-today', scope, candidateId, today],
    queryFn: async () => {
      let q = (supabase as any)
        .from(TABLE)
        .select('*')
        .is('deleted_at', null)
        .eq('checkin_date', today)
        .order('created_at', { ascending: false });
      if (candidateId) q = q.eq('candidate_id', candidateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DailyCheckin[];
    },
    staleTime: 60_000,
  });
}

export function useWeekCheckins(scope: TaskScope = 'active') {
  const { activeCandidate } = useCandidate();
  const candidateId = resolveCandidateId(scope, activeCandidate?.id ?? null);
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['checkins-week', scope, candidateId],
    queryFn: async () => {
      let q = (supabase as any)
        .from(TABLE)
        .select('*')
        .is('deleted_at', null)
        .gte('checkin_date', sinceStr)
        .order('checkin_date', { ascending: false });
      if (candidateId) q = q.eq('candidate_id', candidateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DailyCheckin[];
    },
    staleTime: 60_000,
  });
}

export function useMyCheckinToday() {
  const { activeCandidate } = useCandidate();
  const candidateId = activeCandidate?.id ?? null;
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['my-checkin-today', candidateId, today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      let q = (supabase as any)
        .from(TABLE)
        .select('*')
        .is('deleted_at', null)
        .eq('user_id', user.id)
        .eq('checkin_date', today);
      if (candidateId) q = q.eq('candidate_id', candidateId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as DailyCheckin | null;
    },
    staleTime: 60_000,
  });
}

export function useCreateCheckin() {
  const qc = useQueryClient();
  const { activeCandidate } = useCandidate();

  return useMutation({
    mutationFn: async (input: { delivered: string; planned: string; blocked?: string; user_name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .upsert({
          user_id: user.id,
          user_name: input.user_name ?? null,
          checkin_date: today,
          delivered: input.delivered,
          planned: input.planned,
          blocked: input.blocked ?? null,
          candidate_id: activeCandidate?.id ?? null,
        }, { onConflict: 'user_id,checkin_date,candidate_id' })
        .select()
        .single();
      if (error) throw error;
      return data as DailyCheckin;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins-today'] });
      qc.invalidateQueries({ queryKey: ['my-checkin-today'] });
      qc.invalidateQueries({ queryKey: ['checkins-week'] });
    },
  });
}
