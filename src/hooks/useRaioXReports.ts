import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db, fetchAllRows } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RaioXReport {
  id: string;
  asset_origin: string;
  asset_source_id: string | null;
  asset_key: string;
  subject_name: string;
  subject_municipality: string | null;
  subject_party: string | null;
  subject_position: string | null;
  context_input: string | null;
  report_html: string;
  report_markdown: string | null;
  model: string | null;
  reviewer_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function assetKeyFor(name: string, municipality?: string | null) {
  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  return `${norm(name)}|${norm(municipality ?? '')}`;
}

export function useRaioXReports() {
  return useQuery({
    queryKey: ['raio-x-reports'],
    queryFn: async () => {
      const rows = await fetchAllRows<RaioXReport>(() =>
        (db as any)
          .from('raio_x_reports')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
      );
      return rows;
    },
  });
}

export function useCreateRaioXReport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      payload: Omit<RaioXReport, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at'>,
    ) => {
      const { data, error } = await (db as any)
        .from('raio_x_reports')
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as RaioXReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raio-x-reports'] });
      toast.success('Relatório RAIO-X salvo no perfil do ativo.');
    },
    onError: (e: any) => toast.error(`Erro ao salvar RAIO-X: ${e.message}`),
  });
}

export function useDeleteRaioXReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (db as any)
        .from('raio_x_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raio-x-reports'] });
      toast.success('Relatório removido.');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}
