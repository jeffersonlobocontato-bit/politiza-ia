import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the party name ('Novo' | 'PL') if the current user is a state party manager,
 * or null for admins / other roles.
 *
 * Used to auto-tag and lock the party field in records created by party managers.
 */
export function useUserParty() {
  const { user } = useAuth();
  const [party, setParty] = useState<'Novo' | 'PL' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setParty(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (cancelled) return;
      const roles = (data ?? []).map((r: any) => r.role);
      if (roles.includes('gestor_estadual_novo')) setParty('Novo');
      else if (roles.includes('gestor_estadual_pl')) setParty('PL');
      else setParty(null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { party, loading, isPartyManager: party !== null };
}
