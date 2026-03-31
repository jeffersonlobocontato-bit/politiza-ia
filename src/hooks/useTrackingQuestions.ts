import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrackingRoundQuestion {
  id: string;
  round_id: string;
  question_key: string;
  label: string;
  question_type: string;
  options: any;
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export const QUESTION_PRESETS = [
  { question_key: 'intencao_voto_espontanea', label: 'Intenção de Voto (Espontânea)', question_type: 'candidate_name' },
  { question_key: 'intencao_voto_estimulada', label: 'Intenção de Voto (Estimulada)', question_type: 'candidate_name' },
  { question_key: 'rejeicao', label: 'Rejeição', question_type: 'candidate_name' },
  { question_key: 'conhecimento', label: 'Candidato Mais Conhecido', question_type: 'candidate_name' },
  { question_key: 'avaliacao_governo', label: 'Avaliação do Governo', question_type: 'text' },
];

export function useRoundQuestions(roundId: string | undefined) {
  return useQuery({
    queryKey: ['tracking-round-questions', roundId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tracking_round_questions')
        .select('*')
        .eq('round_id', roundId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TrackingRoundQuestion[];
    },
    enabled: !!roundId,
  });
}

export function useCreateRoundQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questions: Omit<TrackingRoundQuestion, 'id' | 'created_at'>[]) => {
      const { data, error } = await (supabase as any)
        .from('tracking_round_questions')
        .insert(questions)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-round-questions'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRoundQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('tracking_round_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-round-questions'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
