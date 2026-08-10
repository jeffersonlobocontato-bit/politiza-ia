import { useQuery } from '@tanstack/react-query';
import { db, fetchAllRows } from '@/lib/db';

export interface ResultadoRow {
  ano_eleicao: number;
  num_turno: number;
  cd_cargo: number;
  ds_cargo: string;
  nm_candidato: string;
  nr_candidato: string;
  sg_partido: string;
  qt_votos: number;
  cd_municipio_ibge: string | null;
  nm_municipio_ibge: string | null;
  pct_municipio: number | null;
}

/** Todos os resultados (por município) de um ano/turno/cargo. */
export function useResultadosHistoricos(ano: number, turno: number, cargo: number) {
  return useQuery({
    queryKey: ['resultados-historicos', ano, turno, cargo],
    queryFn: async () =>
      fetchAllRows<ResultadoRow>(() =>
        db
          .from('vw_resultados_por_municipio_ibge' as any)
          .select('*')
          .eq('ano_eleicao', ano)
          .eq('num_turno', turno)
          .eq('cd_cargo', cargo),
      ),
    staleTime: 1000 * 60 * 30,
  });
}

/** Combinações disponíveis (ano / turno / cargo). */
export function useCombinacoesDisponiveis() {
  return useQuery({
    queryKey: ['resultados-historicos-combos'],
    queryFn: async () => {
      const { data, error } = await db
        .from('vw_resultados_combos' as any)
        .select('ano_eleicao, num_turno, cd_cargo, ds_cargo');
      if (error) throw error;
      return ((data ?? []) as any[])
        .map(r => ({
          ano: r.ano_eleicao as number,
          turno: r.num_turno as number,
          cargo: r.cd_cargo as number,
          label: r.ds_cargo as string,
        }))
        .sort((a, b) => a.ano - b.ano || a.cargo - b.cargo || a.turno - b.turno);
    },
    staleTime: 1000 * 60 * 60,
  });
}
