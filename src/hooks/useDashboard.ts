import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import type { DashboardKPIs, DbAlert, DbMacroRegion } from '@/types/database';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const { data, error } = await db.rpc('get_dashboard_kpis' as any);
      if (error) throw error;
      return data as DashboardKPIs;
    },
    refetchInterval: 60_000, // auto-refresh every minute
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await db
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DbAlert[];
    },
    refetchInterval: 120_000,
  });
}

export function useMacroRegions() {
  return useQuery({
    queryKey: ['macro-regions'],
    queryFn: async () => {
      const { data, error } = await db.from('macro_regions').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as DbMacroRegion[];
    },
    staleTime: 300_000, // 5 minutes
  });
}
