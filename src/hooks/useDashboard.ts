import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import type { DashboardKPIs, DbAlert, DbAlertStatus } from '@/types/database';
import { toast } from 'sonner';

// ─── KPIs via RPC ───────────────────────────────────────────────────────────
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const { data, error } = await db.rpc('get_dashboard_kpis' as any);
      if (error) throw error;
      return data as DashboardKPIs;
    },
    refetchInterval: 30_000,
  });
}

// ─── Macroregions from DB ────────────────────────────────────────────────────
export function useMacroRegionsDB() {
  return useQuery({
    queryKey: ['macro-regions-db'],
    queryFn: async () => {
      const { data, error } = await db
        .from('macroregions')
        .select('*')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

// ─── Actions stats per macroregion ──────────────────────────────────────────
export function useMacroStats() {
  return useQuery({
    queryKey: ['macro-stats'],
    queryFn: async () => {
      const { data, error } = await db
        .from('actions')
        .select('macroregion_id, status, estimated_impact, executed_people_count')
        .is('deleted_at', null);
      if (error) throw error;
      const rows = data ?? [];

      const map: Record<string, { total: number; done: number; delayed: number; people: number }> = {};
      for (const r of rows) {
        const k = r.macroregion_id ?? 'unknown';
        if (!map[k]) map[k] = { total: 0, done: 0, delayed: 0, people: 0 };
        map[k].total++;
        if (r.status === 'realizada') { map[k].done++; map[k].people += r.executed_people_count ?? 0; }
        if (r.status === 'atrasada') map[k].delayed++;
      }
      return map;
    },
    refetchInterval: 60_000,
  });
}

// ─── Poll timeline from DB (fallback to static if empty) ────────────────────
export function usePollTimeline() {
  return useQuery({
    queryKey: ['poll-timeline'],
    queryFn: async () => {
      const { data, error } = await db
        .from('electoral_surveys' as any)
        .select('collection_date, candidate_score, rival1_score, rival2_score')
        .order('collection_date', { ascending: true })
        .limit(24);
      // If table doesn't exist yet, return empty
      if (error || !data || data.length === 0) return [];
      return (data as any[]).map(d => ({
        date: d.collection_date,
        candidate: d.candidate_score ?? 0,
        rival1: d.rival1_score ?? 0,
        rival2: d.rival2_score ?? 0,
      }));
    },
    staleTime: 300_000,
  });
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await db
        .from('alerts')
        .select('*')
        .neq('status', 'resolvido')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as DbAlert[];
    },
    refetchInterval: 60_000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('alerts')
        .update({ is_read: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DbAlertStatus }) => {
      const { error } = await db
        .from('alerts')
        .update({ status, resolved_at: status === 'resolvido' ? new Date().toISOString() : null } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alerta atualizado!');
    },
  });
}

// ─── Auto-generate alerts based on action data ───────────────────────────────
export function useGenerateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Get action stats grouped by macroregion
      const { data: actions, error } = await db
        .from('actions')
        .select('macroregion_id, status, planned_date')
        .is('deleted_at', null);
      if (error) throw error;
      if (!actions || actions.length === 0) return;

      const stats: Record<string, { total: number; done: number; delayed: number; overdue: number }> = {};
      const now = new Date();

      for (const a of actions) {
        const k = a.macroregion_id ?? 'unknown';
        if (!stats[k]) stats[k] = { total: 0, done: 0, delayed: 0, overdue: 0 };
        stats[k].total++;
        if (a.status === 'realizada') stats[k].done++;
        if (a.status === 'atrasada') stats[k].delayed++;
        // Overdue: prevista but planned_date has passed
        if ((a.status === 'prevista' || a.status === 'confirmada') && new Date(a.planned_date) < now) {
          stats[k].overdue++;
        }
      }

      const toInsert: any[] = [];
      for (const [macroId, s] of Object.entries(stats)) {
        if (s.total === 0) continue;
        const execRate = (s.done / s.total) * 100;
        const delayRate = (s.delayed / s.total) * 100;

        if (delayRate >= 30) {
          toInsert.push({
            level: 'critico',
            title: `Alta taxa de atraso — ${macroId}`,
            description: `${s.delayed} de ${s.total} ações atrasadas (${delayRate.toFixed(0)}%)`,
            territory: macroId,
            macroregion_id: macroId === 'unknown' ? null : macroId,
            recommendation: 'Acionar coordenador regional para redistribuição de tarefas imediatamente.',
            status: 'novo',
            severity: 9,
            is_auto_generated: true,
            is_read: false,
          });
        } else if (execRate < 40 && s.total >= 5) {
          toInsert.push({
            level: 'atencao',
            title: `Baixa execução — ${macroId}`,
            description: `Apenas ${execRate.toFixed(0)}% das ações realizadas (${s.done}/${s.total})`,
            territory: macroId,
            macroregion_id: macroId === 'unknown' ? null : macroId,
            recommendation: 'Revisar planejamento e reforçar equipe na região.',
            status: 'novo',
            severity: 6,
            is_auto_generated: true,
            is_read: false,
          });
        }
        if (s.overdue >= 3) {
          toInsert.push({
            level: 'atencao',
            title: `Ações vencidas sem execução — ${macroId}`,
            description: `${s.overdue} ações com data passada ainda não executadas`,
            territory: macroId,
            macroregion_id: macroId === 'unknown' ? null : macroId,
            recommendation: 'Confirmar ou cancelar ações vencidas para manter o planejamento atualizado.',
            status: 'novo',
            severity: 7,
            is_auto_generated: true,
            is_read: false,
          });
        }
      }

      if (toInsert.length > 0) {
        await db.from('alerts').insert(toInsert);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
