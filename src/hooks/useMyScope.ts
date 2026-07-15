import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { db, fetchAllRows } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

export interface ScopeAsset {
  id: string;
  name: string;
  nickname: string | null;
  type: string | null;
  municipality: string | null;
  candidate_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScopeLeader {
  id: string;
  name: string;
  municipality: string | null;
  status: string | null;
  photo_url: string | null;
  candidate_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScopeAction {
  id: string;
  title: string;
  type: string | null;
  category: string | null;
  status: string | null;
  municipality: string | null;
  executed_people_count: number | null;
  impact_score: number | null;
  candidate_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ScopeMember {
  id: string;
  name: string;
  role: string | null;
  municipality: string | null;
  status: string | null;
  user_id: string | null;
  supervisor_id: string | null;
  candidate_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuthorLookup {
  [userId: string]: { name: string; email: string | null };
}

export interface UseMyScopeResult {
  loading: boolean;
  subtreeUserIds: string[];
  assets: ScopeAsset[];
  leaders: ScopeLeader[];
  actions: ScopeAction[];
  members: ScopeMember[];
  authors: AuthorLookup;
  refetchAll: () => Promise<void>;
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function useMyScope(candidateId?: string | null): UseMyScopeResult {
  const { user } = useAuth();
  const userId = user?.id;

  const subtreeQ = useQuery({
    queryKey: ['scope-subtree', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subtree_user_ids', { _manager: userId! });
      if (error) throw error;
      return (data ?? []) as string[];
    },
  });

  const ids = subtreeQ.data ?? [];
  const enabled = !!userId && ids.length > 0;

  const assetsQ = useQuery({
    queryKey: ['scope-assets', userId, candidateId, ids.join(',')],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchAllRows<ScopeAsset>(() => {
        let q = db.from('political_assets')
          .select('id,name,nickname,type,municipality,candidate_id,created_by,created_at')
          .is('deleted_at', null)
          .in('created_by', ids)
          .order('created_at', { ascending: false });
        if (candidateId) q = q.eq('candidate_id', candidateId);
        return q;
      });
      return rows;
    },
  });

  const leadersQ = useQuery({
    queryKey: ['scope-leaders', userId, candidateId, ids.join(',')],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchAllRows<ScopeLeader>(() => {
        let q = db.from('leaders')
          .select('id,name,municipality,status,photo_url,candidate_id,created_by,created_at')
          .is('deleted_at', null)
          .in('created_by', ids)
          .order('created_at', { ascending: false });
        if (candidateId) q = q.eq('candidate_id', candidateId);
        return q;
      });
      return rows;
    },
  });

  const actionsQ = useQuery({
    queryKey: ['scope-actions', userId, candidateId, ids.join(',')],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchAllRows<ScopeAction>(() => {
        let q = (db as any).from('actions')
          .select('id,title,type,category,status,municipality,executed_people_count,impact_score,candidate_id,created_by,created_at')
          .is('deleted_at', null)
          .in('created_by', ids)
          .order('created_at', { ascending: false });
        if (candidateId) q = q.eq('candidate_id', candidateId);
        return q;
      });
      return rows;
    },
  });

  const membersQ = useQuery({
    queryKey: ['scope-members', userId, candidateId, ids.join(',')],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await fetchAllRows<ScopeMember>(() => {
        let q = (db as any).from('campaign_members')
          .select('id,name,role,municipality,status,user_id,supervisor_id,candidate_id,created_by,created_at')
          .in('created_by', ids)
          .order('created_at', { ascending: false });
        if (candidateId) q = q.eq('candidate_id', candidateId);
        return q;
      });
      return rows;
    },
  });

  const authorsQ = useQuery({
    queryKey: ['scope-authors', ids.join(',')],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      if (error) throw error;
      const lookup: AuthorLookup = {};
      (data ?? []).forEach((p: any) => {
        lookup[p.id] = { name: p.full_name || p.email || 'Usuário', email: p.email };
      });
      return lookup;
    },
  });

  const refetchAll = async () => {
    await Promise.all([
      assetsQ.refetch(),
      leadersQ.refetch(),
      actionsQ.refetch(),
      membersQ.refetch(),
    ]);
  };

  return {
    loading: subtreeQ.isLoading || assetsQ.isLoading || leadersQ.isLoading || actionsQ.isLoading || membersQ.isLoading,
    subtreeUserIds: ids,
    assets: assetsQ.data ?? [],
    leaders: leadersQ.data ?? [],
    actions: actionsQ.data ?? [],
    members: membersQ.data ?? [],
    authors: authorsQ.data ?? {},
    refetchAll,
  };
}

/** Soft-delete quando disponível; caso contrário, delete definitivo. */
export async function softDeleteRow(table: 'political_assets' | 'leaders' | 'actions' | 'campaign_members', id: string) {
  if (table === 'campaign_members') {
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const { error } = await (supabase as any).from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export function newestSince(rows: { created_at: string }[], days: number) {
  const since = daysAgoIso(days);
  return rows.filter(r => r.created_at >= since).length;
}
