import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PrMunicipio {
  id: string;
  nome: string;
  codigo_ibge: string | null;
  is_hub: boolean;
  hub_id: string | null;
  posicao_ciclo: number | null;
  lat: number;
  lng: number;
  pessoas_sede: number;
  pessoas_campo: number;
  criado_manualmente: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- leitura ----------

export function useMalhaMunicipios() {
  return useQuery({
    queryKey: ['pr-municipios'],
    queryFn: async () => {
      const { data, error } = await (db as any)
        .from('pr_municipios')
        .select('*')
        .eq('ativo', true)
        .order('is_hub', { ascending: false })
        .order('posicao_ciclo', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as PrMunicipio[];
    },
  });
}

// Agrupa satélites por hub, já ordenados pela posição do ciclo
export function groupByHub(rows: PrMunicipio[]) {
  const hubs = rows.filter(r => r.is_hub);
  const byHub = new Map<string, PrMunicipio[]>();
  for (const r of rows) {
    if (r.is_hub || !r.hub_id) continue;
    const list = byHub.get(r.hub_id) ?? [];
    list.push(r);
    byHub.set(r.hub_id, list);
  }
  for (const list of byHub.values()) list.sort((a, b) => (a.posicao_ciclo ?? 0) - (b.posicao_ciclo ?? 0));
  return { hubs: hubs.sort((a, b) => a.nome.localeCompare(b.nome)), byHub };
}

// ---------- CRUD de cidade satélite ----------

export function useAddSatelite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      hub_id: string; nome: string; lat: number; lng: number;
    }) => {
      const { data: existing, error: e1 } = await (db as any)
        .from('pr_municipios')
        .select('posicao_ciclo')
        .eq('hub_id', payload.hub_id)
        .eq('ativo', true)
        .order('posicao_ciclo', { ascending: false })
        .limit(1);
      if (e1) throw e1;
      const nextPos = ((existing?.[0] as any)?.posicao_ciclo ?? 0) + 1;

      const { error } = await (db as any).from("pr_municipios").insert({
        nome: payload.nome,
        hub_id: payload.hub_id,
        is_hub: false,
        posicao_ciclo: nextPos,
        lat: payload.lat,
        lng: payload.lng,
        criado_manualmente: true,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pr-municipios'] });
      toast.success('Cidade adicionada à malha.');
    },
    onError: (e: any) => toast.error(`Erro ao adicionar cidade: ${e.message}`),
  });
}

export function useRenameSatelite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, nome, lat, lng }: { id: string; nome: string; lat?: number; lng?: number }) => {
      const patch: Record<string, any> = { nome, updated_by: user?.id };
      if (lat !== undefined) patch.lat = lat;
      if (lng !== undefined) patch.lng = lng;
      const { error } = await (db as any).from("pr_municipios").update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pr-municipios'] });
      toast.success('Cidade atualizada.');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });
}

export function useRemoveSatelite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (db as any).from("pr_municipios").update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pr-municipios'] });
      toast.success('Cidade removida da malha.');
    },
    onError: (e: any) => toast.error(`Erro ao remover: ${e.message}`),
  });
}

// Reordena o ciclo de um hub inteiro após drag-and-drop (envia a nova ordem completa)
export function useReorderSatelites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          (db as any).from("pr_municipios").update({ posicao_ciclo: idx + 1 }).eq('id', id)
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pr-municipios'] });
      toast.success('Ordem do ciclo atualizada.');
    },
    onError: (e: any) => toast.error(`Erro ao reordenar: ${e.message}`),
  });
}

// ---------- Geração do ciclo de 30 dias na Agenda ----------

export function useGerarCiclo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      hub, satelites, dataInicio,
    }: { hub: PrMunicipio; satelites: PrMunicipio[]; dataInicio: string }) => {
      const start = new Date(dataInicio + 'T12:00:00');
      const rows = satelites.slice(0, 30).map((sat, idx) => {
        const d = new Date(start);
        d.setDate(d.getDate() + idx);
        return {
          title: `Panfletagem / Ativação — ${sat.nome}`,
          type: 'ativacao_campo' as const,
          category: 'Campo',
          description: `Ciclo de malha logística — dia ${idx + 1} a partir de ${hub.nome}. ${hub.pessoas_sede} pessoas na sede, ${hub.pessoas_campo} pessoas em campo em ${sat.nome}.`,
          municipality: sat.nome,
          microregion: null,
          macroregion_id: null,
          address: null,
          lat: sat.lat,
          lng: sat.lng,
          responsible: `Equipe ${hub.nome}`,
          team: [],
          planned_date: d.toISOString().split('T')[0],
          planned_time: '09:00',
          priority: 'media' as const,
          target_audience: 'Público geral',
          estimated_impact: hub.pessoas_campo * 50,
          status: 'prevista' as const,
          observations: null,
          executed_date: null,
          executed_people_count: null,
          evidence_photos: [] as string[],
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        };
      });
      if (rows.length === 0) return { count: 0 };
      const { error } = await (db as any).from('actions').insert(rows);
      if (error) throw error;
      return { count: rows.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['agenda-events'] });
      qc.invalidateQueries({ queryKey: ['geo-leads'] });
      toast.success(`${res.count} ativações geradas na Agenda.`);
    },
    onError: (e: any) => toast.error(`Erro ao gerar ciclo: ${e.message}`),
  });
}
