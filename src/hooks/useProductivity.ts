import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductivityRow {
  id: string;
  name: string | null;
  total_score: number;
  avg_score: number;
  action_count: number;
  leader_count?: number;
  people_impacted: number;
  kind?: 'coordenador' | 'regiao';
}

export interface ProductivityData {
  period_days: number;
  candidate_id: string | null;
  totals: {
    action_count: number;
    total_score: number;
    avg_score: number;
    people_impacted: number;
  };
  leaders: ProductivityRow[];
  micros: ProductivityRow[];
  macros: ProductivityRow[];
}

export function useProductivity(candidateId: string | null, periodDays: number) {
  return useQuery({
    queryKey: ['productivity-ranking', candidateId, periodDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_productivity_ranking' as any, {
        p_candidate_id: candidateId,
        p_period_days: periodDays,
      });
      if (error) throw error;
      return data as unknown as ProductivityData;
    },
    staleTime: 60_000,
  });
}
