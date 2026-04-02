import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import type { DbAction } from '@/types/database';

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  type: 'action' | 'tracking_round' | 'alert';
  category?: string;
  status?: string;
  priority?: string;
  municipality?: string;
  macroregion_id?: string | null;
  microregion?: string | null;
  responsible?: string;
  description?: string | null;
  rawAction?: DbAction;
  endDate?: string | null;
}

function getTerritoryScopeFromRoles(roles: any[]) {
  for (const r of roles) {
    if (['admin_master', 'coordenador_geral', 'coordenador_estadual'].includes(r.role)) {
      return { level: 'admin' as const };
    }
  }
  for (const r of roles) {
    if (r.role === 'coordenador_regional' && r.macroregion_id) {
      return { level: 'regional' as const, macroregion_id: r.macroregion_id };
    }
    if (r.role === 'coordenador_microrregional' && r.microregion) {
      return { level: 'microrregional' as const, macroregion_id: r.macroregion_id, microregion: r.microregion };
    }
    if (r.role === 'coordenador_municipal' && r.municipality) {
      return { level: 'municipal' as const, macroregion_id: r.macroregion_id, microregion: r.microregion, municipality: r.municipality };
    }
  }
  return { level: 'admin' as const };
}

export function useAgendaEvents(month: number, year: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agenda-events', month, year, user?.id],
    queryFn: async () => {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      // Fetch user roles for territory scope
      let scope = { level: 'admin' as const } as ReturnType<typeof getTerritoryScopeFromRoles>;
      if (user?.id) {
        const { data: userRoles } = await (db as any).from('user_roles').select('role, macroregion_id, microregion, municipality').eq('user_id', user.id);
        if (userRoles?.length) {
          scope = getTerritoryScopeFromRoles(userRoles);
        }
      }

      // Fetch actions
      let actionsQuery = (db as any)
        .from('actions')
        .select('*')
        .is('deleted_at', null)
        .gte('planned_date', startDate)
        .lte('planned_date', endDate)
        .order('planned_date', { ascending: true });

      if (scope.level === 'regional') {
        actionsQuery = actionsQuery.eq('macroregion_id', scope.macroregion_id);
      } else if (scope.level === 'microrregional') {
        actionsQuery = actionsQuery.eq('microregion', scope.microregion);
      } else if (scope.level === 'municipal') {
        actionsQuery = actionsQuery.eq('municipality', scope.municipality);
      }

      const { data: actions } = await actionsQuery;

      // Fetch tracking rounds that overlap this month
      const { data: rounds } = await (db as any)
        .from('tracking_rounds')
        .select('*')
        .is('deleted_at', null)
        .lte('start_date', endDate)
        .or(`end_date.gte.${startDate},end_date.is.null`);

      // Fetch active strategic alerts
      const { data: alerts } = await (db as any)
        .from('strategic_alerts')
        .select('*')
        .in('status', ['ativo', 'em_analise'])
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      const events: AgendaEvent[] = [];

      // Map actions
      (actions ?? []).forEach((a: DbAction) => {
        events.push({
          id: a.id,
          title: a.title,
          date: a.planned_date,
          time: a.planned_time ?? null,
          type: 'action',
          category: a.type,
          status: a.status,
          priority: a.priority,
          municipality: a.municipality ?? undefined,
          macroregion_id: a.macroregion_id,
          microregion: a.microregion,
          responsible: a.responsible ?? undefined,
          description: a.description,
          rawAction: a,
        });
      });

      // Map tracking rounds
      (rounds ?? []).forEach((r: any) => {
        events.push({
          id: r.id,
          title: `🔬 ${r.title}`,
          date: r.start_date,
          time: r.start_time ?? null,
          type: 'tracking_round',
          status: r.status,
          municipality: r.municipality ?? undefined,
          description: r.description,
          endDate: r.end_date,
        });
      });

      // Map alerts
      (alerts ?? []).forEach((al: any) => {
        events.push({
          id: al.id,
          title: `⚠️ ${al.title}`,
          date: al.created_at.split('T')[0],
          time: null,
          type: 'alert',
          status: al.status,
          municipality: al.municipality ?? undefined,
          description: al.description,
        });
      });

      return { events, scope };
    },
    enabled: !!user?.id,
  });
}
