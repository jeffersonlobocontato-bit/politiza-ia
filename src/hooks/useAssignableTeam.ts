import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  role: string | null;
  hierarchy_level: number | null;
  supervisor_id: string | null;
  municipality: string | null;
}

export interface MyCampaignMember {
  id: string;
  name: string;
  role: string | null;
  hierarchy_level: number | null;
  candidate_id: string | null;
}

/**
 * Lista os membros da hierarquia que o usuário logado pode delegar tarefas.
 * - Admin master: todos os membros ativos do candidato.
 * - Outros: apenas a subárvore (subordinados diretos e indiretos via supervisor_id).
 */
export function useAssignableTeam(candidateId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['delegable-members', user?.id, candidateId],
    enabled: !!user?.id && !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_delegable_members', {
        _user_id: user!.id,
        _candidate_id: candidateId!,
      });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    staleTime: 60_000,
  });
}

/** Retorna o registro do próprio usuário em campaign_members para o candidato. */
export function useMyCampaignMember(candidateId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-campaign-member', user?.id, candidateId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_campaign_member', {
        _user_id: user!.id,
        _candidate_id: candidateId ?? null,
      });
      if (error) throw error;
      const rows = (data ?? []) as MyCampaignMember[];
      return rows[0] ?? null;
    },
    staleTime: 60_000,
  });
}
