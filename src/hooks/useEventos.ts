// src/hooks/useEventos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCandidate } from '@/contexts/CandidateContext';

export type EventoStatus = 'rascunho' | 'publicado' | 'encerrado' | 'cancelado';
export type InscricaoStatus = 'confirmada' | 'cancelada' | 'presente' | 'ausente';

export interface Evento {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  imagem_capa_url: string | null;
  data_inicio: string;
  data_fim: string | null;
  local_nome: string | null;
  endereco: string | null;
  municipio: string | null;
  macroregion_id: string | null;
  lat: number | null;
  lng: number | null;
  is_online: boolean;
  link_online: string | null;
  capacidade_maxima: number | null;
  status: EventoStatus;
  exige_aprovacao: boolean;
  campos_extra: { id: string; label: string; tipo: 'texto' | 'select'; opcoes?: string[]; obrigatorio?: boolean }[];
  tema_paleta_id: string;
  tema_cor_primaria: string;
  tema_cor_primaria_escura: string;
  tema_cor_overlay: string;
  banner_aspect_ratio: string;
  banner_position_x: number;
  banner_position_y: number;
  banner_zoom: number;
  candidate_id: string | null;
  created_at: string;
  updated_at: string;
  total_inscritos?: number;
  total_presentes?: number;
}

export interface Inscricao {
  id: string;
  evento_id: string;
  nome: string;
  email: string | null;
  telefone: string;
  municipio: string;
  cargo_interesse: string | null;
  partido: string | null;
  observacoes: string | null;
  respostas_extra: Record<string, string>;
  codigo_confirmacao: string;
  status: InscricaoStatus;
  checkin_at: string | null;
  created_at: string;
}

// ─── EVENTOS (uso interno, autenticado) ───────────────────────────────────────

export function useEventos() {
  const { activeCandidate } = useCandidate();
  const candidateId = activeCandidate?.id ?? null;

  return useQuery({
    queryKey: ['eventos', candidateId],
    queryFn: async () => {
      let q = (supabase as any)
        .from('eventos_com_contagem')
        .select('*')
        .order('data_inicio', { ascending: false });
      if (candidateId) q = q.eq('candidate_id', candidateId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
    staleTime: 30_000,
  });
}

export function useEventoById(id: string | null) {
  return useQuery({
    queryKey: ['evento', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('eventos_com_contagem').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Evento;
    },
  });
}

// ─── EVENTO PÚBLICO (uso na página pública, sem login) ────────────────────────

export function useEventoPublico(slug: string | null) {
  return useQuery({
    queryKey: ['evento-publico', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('eventos')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'publicado')
        .single();
      if (error) throw error;
      return data as Evento;
    },
  });
}

export function useCreateEvento() {
  const qc = useQueryClient();
  const { activeCandidate } = useCandidate();

  return useMutation({
    mutationFn: async (input: Partial<Evento>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('eventos')
        .insert({ ...input, candidate_id: activeCandidate?.id ?? null, created_by: user?.id })
        .select().single();
      if (error) throw error;
      return data as Evento;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventos'] }),
  });
}

export function useUpdateEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Evento> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('eventos').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Evento;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventos'] }),
  });
}

export function useDeleteEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('eventos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventos'] }),
  });
}

// ─── Upload de banner ──────────────────────────────────────────────────────────

export function useUploadEventoBanner() {
  return useMutation({
    mutationFn: async ({ eventoId, file }: { eventoId: string; file: File }) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${eventoId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('evento-banners')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      // Bucket privado — usamos signed URL com expiração longa (10 anos)
      const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
      const { data: signed, error: sErr } = await supabase.storage
        .from('evento-banners').createSignedUrl(path, TEN_YEARS);
      if (sErr) throw sErr;
      return signed.signedUrl;
    },
  });
}

// ─── INSCRIÇÕES — leitura interna ──────────────────────────────────────────────

export function useInscricoes(eventoId: string | null) {
  return useQuery({
    queryKey: ['inscricoes', eventoId],
    enabled: !!eventoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('inscricoes')
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inscricao[];
    },
    staleTime: 15_000,
  });
}

export function useCheckinInscricao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, presente }: { id: string; presente: boolean }) => {
      const { error } = await (supabase as any)
        .from('inscricoes')
        .update({
          status: presente ? 'presente' : 'confirmada',
          checkin_at: presente ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscricoes'] }),
  });
}

export function useDeleteInscricao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('inscricoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscricoes'] }),
  });
}

// ─── INSCRIÇÃO PÚBLICA — submissão sem login ───────────────────────────────────

export interface InscricaoInput {
  evento_id: string;
  nome: string;
  telefone: string;
  municipio: string;
  email?: string;
  cargo_interesse?: string;
  partido?: string;
  observacoes?: string;
  respostas_extra?: Record<string, string>;
}

export function useCreateInscricaoPublica() {
  return useMutation({
    mutationFn: async (input: InscricaoInput) => {
      const { data, error } = await (supabase as any)
        .from('inscricoes')
        .insert(input)
        .select('id, codigo_confirmacao, nome, email')
        .single();
      if (error) {
        // Telefone duplicado no mesmo evento
        if (error.code === '23505') {
          throw new Error('Este número de celular já está inscrito neste evento.');
        }
        throw error;
      }
      return data as { id: string; codigo_confirmacao: string; nome: string; email: string };
    },
  });
}
