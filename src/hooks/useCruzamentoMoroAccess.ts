import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Retorna se o usuário logado pode acessar a tela "Cruzamento Moro".
 * Regras:
 *  - admin_master sempre pode
 *  - qualquer outro papel só pode se tiver registro em `cruzamento_moro_access`
 *
 * Também expõe `cruzamentoOnly`: usuário só tem grant de cruzamento e nenhum
 * papel funcional (roles vazio) — nesse caso a plataforma inteira é restrita
 * à página /inteligencia/cruzamento-moro.
 */
export function useCruzamentoMoroAccess() {
  const { user, roles, loading: authLoading } = useAuth();
  const isMaster = roles?.includes('admin_master' as any);

  const q = useQuery({
    queryKey: ['cruzamento-moro-access', user?.id],
    enabled: !!user?.id && !authLoading,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cruzamento_moro_access')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });

  const hasGrant = !!q.data;
  const canAccess = isMaster || hasGrant;
  const cruzamentoOnly =
    !isMaster && hasGrant && (!roles || roles.length === 0);

  return {
    canAccess,
    isMaster,
    hasGrant,
    cruzamentoOnly,
    loading: authLoading || q.isLoading,
  };
}
