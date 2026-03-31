import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import type { DbTrackingRound, DbTrackingInterview, DbTrackingInterviewAnswer } from '@/types/tracking';
import { toast } from 'sonner';

export function useTrackingRounds() {
  const { activeCandidate } = useCandidate();
  return useQuery({
    queryKey: ['tracking-rounds', activeCandidate?.id],
    queryFn: async () => {
      const query = (supabase as any).from('tracking_rounds').select('*').order('created_at', { ascending: false });
      if (activeCandidate?.id) query.eq('candidate_id', activeCandidate.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbTrackingRound[];
    },
    enabled: !!activeCandidate?.id,
  });
}

export function useActiveRounds() {
  const { activeCandidate } = useCandidate();
  return useQuery({
    queryKey: ['tracking-rounds-active', activeCandidate?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tracking_rounds')
        .select('*')
        .eq('status', 'aberta')
        .eq('candidate_id', activeCandidate!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbTrackingRound[];
    },
    enabled: !!activeCandidate?.id,
  });
}

export function useCreateRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (round: Partial<DbTrackingRound>) => {
      const { data, error } = await (supabase as any).from('tracking_rounds').insert(round).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-rounds'] });
      toast.success('Rodada criada com sucesso');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbTrackingRound> & { id: string }) => {
      const { data, error } = await (supabase as any).from('tracking_rounds').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-rounds'] });
      toast.success('Rodada atualizada');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRoundInterviewCount(roundId: string | undefined) {
  return useQuery({
    queryKey: ['tracking-interview-count', roundId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('tracking_interviews')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', roundId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!roundId,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { interview: Omit<DbTrackingInterview, 'id' | 'created_at'>; answers: Omit<DbTrackingInterviewAnswer, 'id' | 'interview_id' | 'created_at'>[] }) => {
      const { data: interview, error: iErr } = await (supabase as any)
        .from('tracking_interviews')
        .insert(payload.interview)
        .select()
        .single();
      if (iErr) throw iErr;

      if (payload.answers.length > 0) {
        const answersWithId = payload.answers.map(a => ({ ...a, interview_id: interview.id }));
        const { error: aErr } = await (supabase as any).from('tracking_interview_answers').insert(answersWithId);
        if (aErr) throw aErr;
      }

      return interview;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-interview-count'] });
      toast.success('Entrevista registrada com sucesso!');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
