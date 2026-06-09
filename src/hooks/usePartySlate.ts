import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SlateParty = 'PL' | 'Novo';
export type SlateCargo = 'Deputado Federal' | 'Deputado Estadual';
export type SlateFiliacaoStatus = 'ok' | 'pl' | 'pl_mulher' | 'deputado_atual' | 'pendente' | 'outro';

export interface SlateCandidate {
  id: string;
  party: SlateParty;
  cargo: SlateCargo;
  order_index: number;
  name: string;
  city: string | null;
  association: string | null;
  filiacao_status: SlateFiliacaoStatus;
  filiacao_note: string | null;
  phone: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  votes_bom: number | null;
  votes_medio: number | null;
  votes_ruim: number | null;
  general_status: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TABLE = 'party_slate_candidates';

export function usePartySlate(party: SlateParty | null) {
  return useQuery<SlateCandidate[]>({
    queryKey: ['party-slate', party],
    enabled: !!party,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('party', party)
        .is('deleted_at', null)
        .order('cargo', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SlateCandidate[];
    },
  });
}

export function useAllPartySlates() {
  return useQuery<SlateCandidate[]>({
    queryKey: ['party-slate', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .is('deleted_at', null)
        .order('party', { ascending: true })
        .order('cargo', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SlateCandidate[];
    },
  });
}

export function useUpsertSlateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SlateCandidate> & { party: SlateParty; cargo: SlateCargo; name: string; order_index: number }) => {
      const { id, ...rest } = payload as any;
      if (id) {
        const { data, error } = await (supabase as any).from(TABLE).update(rest).eq('id', id).select().single();
        if (error) throw error;
        return data as SlateCandidate;
      }
      const { data, error } = await (supabase as any).from(TABLE).insert(rest).select().single();
      if (error) throw error;
      return data as SlateCandidate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party-slate'] }),
  });
}

export function useDeleteSlateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party-slate'] }),
  });
}
