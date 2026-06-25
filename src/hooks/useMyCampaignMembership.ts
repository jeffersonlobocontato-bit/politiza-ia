import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyCampaignMembership {
  id: string;
  name: string;
  role: string | null;
  hierarchy_level: number | null;
  candidate_id: string | null;
}

/**
 * Retorna o registro do usuário logado em campaign_members (função específica
 * dentro de uma coordenação). Usa o RPC get_my_campaign_member, que faz match
 * por user_id, email ou nome.
 */
export function useMyCampaignMembership() {
  const { user } = useAuth();
  return useQuery<MyCampaignMembership | null>({
    queryKey: ['my-campaign-member', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_my_campaign_member', {
        _user_id: user!.id,
        _candidate_id: null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
