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
      const rows = await fetchAllRows<{
        ano_eleicao: number;
        num_turno: number;
        cd_cargo: number;
        ds_cargo: string;
      }>(() =>
        db
          .from('resultados_eleicoes_historicos' as any)
          .select('ano_eleicao, num_turno, cd_cargo, ds_cargo')
          .order('ano_eleicao'),
      );
      const seen = new Map<string, { ano: number; turno: number; cargo: number; label: string }>();
      rows.forEach(r => {
        const key = `${r.ano_eleicao}-${r.num_turno}-${r.cd_cargo}`;
        if (!seen.has(key)) {
          seen.set(key, {
            ano: r.ano_eleicao,
            turno: r.num_turno,
            cargo: r.cd_cargo,
            label: r.ds_cargo,
          });
        }
      });
      return Array.from(seen.values());
    },
    staleTime: 1000 * 60 * 60,
  });
}
