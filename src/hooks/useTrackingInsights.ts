import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';
import type { DbTrackingAiInsight, DbTrackingAiAlert } from '@/types/tracking';
import { toast } from 'sonner';

export function useTrackingInsights(roundId?: string) {
  const { activeCandidate } = useCandidate();
  return useQuery({
    queryKey: ['tracking-insights', activeCandidate?.id, roundId],
    queryFn: async () => {
      let query = (supabase as any).from('tracking_ai_insights').select('*').order('priority_score', { ascending: false });
      if (activeCandidate?.id) query = query.eq('candidate_id', activeCandidate.id);
      if (roundId) query = query.eq('round_id', roundId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbTrackingAiInsight[];
    },
    enabled: !!activeCandidate?.id,
  });
}

export function useTrackingAlerts(roundId?: string) {
  const { activeCandidate } = useCandidate();
  return useQuery({
    queryKey: ['tracking-alerts', activeCandidate?.id, roundId],
    queryFn: async () => {
      let query = (supabase as any).from('tracking_ai_alerts').select('*').order('priority_score', { ascending: false });
      if (activeCandidate?.id) query = query.eq('candidate_id', activeCandidate.id);
      if (roundId) query = query.eq('round_id', roundId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbTrackingAiAlert[];
    },
    enabled: !!activeCandidate?.id,
  });
}

export function useActiveAlertCount() {
  const { activeCandidate } = useCandidate();
  return useQuery({
    queryKey: ['tracking-alerts-active-count', activeCandidate?.id],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('tracking_ai_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', activeCandidate!.id)
        .in('status', ['novo', 'em_analise']);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!activeCandidate?.id,
  });
}

export function useUpdateInsightStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resolution_note }: { id: string; status: string; resolution_note?: string }) => {
      const updates: any = { status };
      if (resolution_note) updates.resolution_note = resolution_note;
      const { error } = await (supabase as any).from('tracking_ai_insights').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-insights'] });
      toast.success('Status atualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resolution_note }: { id: string; status: string; resolution_note?: string }) => {
      const updates: any = { status };
      if (resolution_note) updates.resolution_note = resolution_note;
      const { error } = await (supabase as any).from('tracking_ai_alerts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-alerts'] });
      toast.success('Status atualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRunTrackingAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundId, candidateId }: { roundId: string; candidateId: string }) => {
      const { data, error } = await supabase.functions.invoke('tracking-analysis', {
        body: { round_id: roundId, candidate_id: candidateId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-insights'] });
      qc.invalidateQueries({ queryKey: ['tracking-alerts'] });
      toast.success('Análise de IA concluída!');
    },
    onError: (e: any) => toast.error(`Erro na análise: ${e.message}`),
  });
}

export function useTrackingDashboardData(roundId?: string) {
  const { activeCandidate } = useCandidate();
  return useQuery({
    queryKey: ['tracking-dashboard', activeCandidate?.id, roundId],
    queryFn: async () => {
      // Fetch interviews + answers for the round
      let interviewQuery = (supabase as any)
        .from('tracking_interviews')
        .select('*, tracking_interview_answers(*)');
      if (roundId) interviewQuery = interviewQuery.eq('round_id', roundId);

      const { data: interviews, error } = await interviewQuery;
      if (error) throw error;

      const totalInterviews = interviews?.length ?? 0;
      const municipalities = new Set((interviews ?? []).map((i: any) => i.municipality).filter(Boolean));
      const coverageCities = municipalities.size;

      // Consolidate answers
      const allAnswers = (interviews ?? []).flatMap((i: any) => i.tracking_interview_answers ?? []);
      const stimulatedVotes = allAnswers.filter((a: any) => a.question_key === 'intencao_voto_estimulada');
      const rejections = allAnswers.filter((a: any) => a.question_key === 'rejeicao');

      // Candidate vote counts
      const voteCounts: Record<string, number> = {};
      stimulatedVotes.forEach((a: any) => {
        const name = a.answer_value || 'Outros';
        voteCounts[name] = (voteCounts[name] || 0) + 1;
      });

      const rejectCounts: Record<string, number> = {};
      rejections.forEach((a: any) => {
        const name = a.answer_value || 'Outros';
        rejectCounts[name] = (rejectCounts[name] || 0) + 1;
      });

      // Cross-tab by gender
      const genderCross: Record<string, Record<string, number>> = {};
      (interviews ?? []).forEach((i: any) => {
        const gender = i.respondent_gender || 'Não informado';
        const answers = (i.tracking_interview_answers ?? []).filter((a: any) => a.question_key === 'intencao_voto_estimulada');
        answers.forEach((a: any) => {
          if (!genderCross[gender]) genderCross[gender] = {};
          const name = a.answer_value || 'Outros';
          genderCross[gender][name] = (genderCross[gender][name] || 0) + 1;
        });
      });

      // Cross-tab by age
      const ageCross: Record<string, Record<string, number>> = {};
      (interviews ?? []).forEach((i: any) => {
        const age = i.respondent_age_range || 'Não informado';
        const answers = (i.tracking_interview_answers ?? []).filter((a: any) => a.question_key === 'intencao_voto_estimulada');
        answers.forEach((a: any) => {
          if (!ageCross[age]) ageCross[age] = {};
          const name = a.answer_value || 'Outros';
          ageCross[age][name] = (ageCross[age][name] || 0) + 1;
        });
      });

      return {
        totalInterviews,
        coverageCities,
        voteCounts,
        rejectCounts,
        genderCross,
        ageCross,
        interviews: interviews ?? [],
      };
    },
    enabled: !!activeCandidate?.id,
  });
}
