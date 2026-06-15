import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  role: string | null;
}

/** Lista membros de campanha (campaign_members) de um candidato para popular o autocomplete "Atribuir a". */
export function useAssignableTeam(candidateId: string | null | undefined) {
  return useQuery({
    queryKey: ['assignable-team', candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_members')
        .select('id, user_id, name, role')
        .eq('candidate_id', candidateId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    staleTime: 60_000,
  });
}
