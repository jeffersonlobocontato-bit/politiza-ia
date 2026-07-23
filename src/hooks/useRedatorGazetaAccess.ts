import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Retorna se o usuário logado pode acessar o "Redator Gazeta".
 *
 * Diferente do Cruzamento Moro, aqui NÃO existe bypass por role — nem
 * admin_master entra automaticamente. O acesso é 100% por concessão
 * individual em `redator_gazeta_access` (inicialmente só Jefferson Lobo),
 * para manter a aba exclusiva de fato.
 */
export function useRedatorGazetaAccess() {
  const { user, loading: authLoading } = useAuth();

  const q = useQuery({
    queryKey: ['redator-gazeta-access', user?.id],
    enabled: !!user?.id && !authLoading,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('redator_gazeta_access')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });

  return {
    canAccess: !!q.data,
    loading: authLoading || q.isLoading,
  };
}
