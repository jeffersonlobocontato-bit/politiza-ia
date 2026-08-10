import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';

export type CenarioChapa = 'ruim' | 'medio' | 'bom';

export const CENARIO_LABEL: Record<CenarioChapa, string> = {
  ruim: 'Ruim',
  medio: 'Médio',
  bom: 'Bom',
};

export interface ChapaOption {
  id: string;
  name: string;
  party: string;
  cargo: string;
  city: string | null;
  votes_bom: number | null;
  votes_medio: number | null;
  votes_ruim: number | null;
}

export interface DiagnosticoCidade {
  municipio: string;
  espacoDisponivel: number;
  pctEspacoDisponivel: number;
  basePropria: boolean;
  votosProprios: number;
  meta: number;
  acumulado: number;
  pctMetaCoberta: number;
}

/** Pré-candidatos das chapas (fonte do cruzamento). */
export function useChapaCandidatos() {
  return useQuery({
    queryKey: ['cruzamento-chapa-candidatos'],
    queryFn: async (): Promise<ChapaOption[]> => {
      const { data, error } = await (db as any)
        .from('party_slate_candidates')
        .select('id, name, party, cargo, city, votes_bom, votes_medio, votes_ruim')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('cargo')
        .order('name');
      if (error) throw error;
      return (data ?? []) as ChapaOption[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** Diagnóstico de espaço eleitoral disponível para um pré-candidato. */
export function useDiagnosticoChapa(slateId: string | null, cenario: CenarioChapa) {
  return useQuery({
    queryKey: ['cruzamento-diagnostico', slateId, cenario],
    enabled: !!slateId,
    queryFn: async (): Promise<DiagnosticoCidade[]> => {
      const { data, error } = await db.rpc('fn_diagnostico_chapa' as any, {
        p_slate_id: slateId,
        p_cenario: cenario,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        municipio: r.nm_municipio as string,
        espacoDisponivel: Number(r.espaco_disponivel ?? 0),
        pctEspacoDisponivel: Number(r.pct_espaco_disponivel ?? 0),
        basePropria: Boolean(r.candidato_ja_votou_aqui),
        votosProprios: Number(r.votos_proprios_historicos ?? 0),
        meta: Number(r.meta_cenario ?? 0),
        acumulado: Number(r.votos_acumulados_ranking ?? 0),
        pctMetaCoberta: Number(r.pct_meta_coberta ?? 0),
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}
