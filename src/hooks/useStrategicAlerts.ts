import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StrategicAlertType = 'risco_operacional' | 'risco_eleitoral' | 'ineficiencia_atuacao' | 'oportunidade_estrategica';
export type StrategicAlertStatus = 'ativo' | 'em_analise' | 'resolvido' | 'descartado';

export interface HierarchyNode {
  name: string;
  role: string;
  level: number;
}

export interface StrategicAlert {
  id: string;
  type: StrategicAlertType;
  title: string;
  description: string | null;
  recommendation: string | null;
  severity: number;
  score: number;
  status: StrategicAlertStatus;
  territory: string | null;
  municipality: string | null;
  macroregion_id: string | null;
  microregion: string | null;
  risk_index: number | null;
  opportunity_index: number | null;
  source_data: Record<string, unknown> | null;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  resolution_note: string | null;
  responsible_name: string | null;
  responsible_role: string | null;
  hierarchy_chain: HierarchyNode[] | null;
}

// ─── Fetch all active strategic alerts ────────────────────────────────────────
export function useStrategicAlerts(filters?: {
  type?: StrategicAlertType | 'all';
  status?: StrategicAlertStatus | 'all';
  macroregion_id?: string;
  minSeverity?: number;
}) {
  return useQuery({
    queryKey: ['strategic-alerts', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('strategic_alerts')
        .select('*')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'all') query = query.eq('type', filters.type);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      else if (!filters?.status) query = query.neq('status', 'resolvido').neq('status', 'descartado');
      if (filters?.macroregion_id) query = query.eq('macroregion_id', filters.macroregion_id);
      if (filters?.minSeverity) query = query.gte('severity', filters.minSeverity);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []) as StrategicAlert[];
    },
    refetchInterval: 120_000, // refetch every 2 min
  });
}

// ─── KPIs for the crisis card ─────────────────────────────────────────────────
export function useStrategicKPIs() {
  return useQuery({
    queryKey: ['strategic-kpis'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('strategic_alerts')
        .select('type, severity, status, risk_index, opportunity_index')
        .neq('status', 'resolvido')
        .neq('status', 'descartado');
      if (error) throw error;

      const rows = (data ?? []) as StrategicAlert[];
      const active = rows.length;
      const critical = rows.filter(r => r.severity >= 8).length;
      const opportunities = rows.filter(r => r.type === 'oportunidade_estrategica').length;
      const avgRisk = rows.length > 0
        ? rows.filter(r => r.risk_index !== null).reduce((s, r) => s + (r.risk_index ?? 0), 0) /
          Math.max(rows.filter(r => r.risk_index !== null).length, 1)
        : 0;
      const avgOpp = rows.length > 0
        ? rows.filter(r => r.opportunity_index !== null).reduce((s, r) => s + (r.opportunity_index ?? 0), 0) /
          Math.max(rows.filter(r => r.opportunity_index !== null).length, 1)
        : 0;

      return {
        active,
        critical,
        opportunities,
        riskIndex: Math.round(avgRisk),
        opportunityIndex: Math.round(avgOpp),
      };
    },
    refetchInterval: 120_000,
  });
}

// ─── Run analysis now ─────────────────────────────────────────────────────────
export function useRunStrategicAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strategic-analysis`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao executar análise' }));
        throw new Error(err.error ?? 'Erro desconhecido');
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['strategic-alerts'] });
      qc.invalidateQueries({ queryKey: ['strategic-kpis'] });
      toast.success(`Análise concluída — ${data.inserted ?? 0} alertas gerados`);
    },
    onError: (err: Error) => {
      toast.error(`Erro na análise: ${err.message}`);
    },
  });
}

// ─── Update alert status ───────────────────────────────────────────────────────
export function useUpdateStrategicAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resolution_note }: { id: string; status: StrategicAlertStatus; resolution_note: string }) => {
      const { error } = await (supabase as any)
        .from('strategic_alerts')
        .update({
          status,
          resolution_note,
          is_read: true,
          resolved_at: status === 'resolvido' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategic-alerts'] });
      qc.invalidateQueries({ queryKey: ['strategic-kpis'] });
    },
  });
}

// ─── Mark as read ──────────────────────────────────────────────────────────────
export function useMarkStrategicAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('strategic_alerts')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategic-alerts'] }),
  });
}

// ─── Type label/color config ──────────────────────────────────────────────────
export const ALERT_TYPE_CONFIG = {
  risco_operacional: {
    label: 'Risco Operacional',
    bgClass: 'bg-status-error-bg',
    borderClass: 'border-status-error/40',
    iconClass: 'text-status-error',
    badgeClass: 'bg-status-error-bg text-status-error border border-status-error/30',
    // kept for map usage
    color: 'hsl(var(--status-error))',
    bg: 'hsl(var(--status-error-bg))',
    border: 'hsl(var(--status-error) / 0.35)',
    badge: 'bg-status-error-bg text-status-error border border-status-error/30',
    mapColor: 'hsl(var(--risk-high))',
  },
  risco_eleitoral: {
    label: 'Risco Eleitoral',
    bgClass: 'bg-status-error-bg',
    borderClass: 'border-status-error/30',
    iconClass: 'text-status-error',
    badgeClass: 'bg-status-error-bg text-status-error border border-status-error/20',
    color: 'hsl(var(--status-error))',
    bg: 'hsl(var(--status-error-bg))',
    border: 'hsl(var(--status-error) / 0.25)',
    badge: 'bg-status-error-bg text-status-error border border-status-error/20',
    mapColor: 'hsl(var(--risk-high))',
  },
  ineficiencia_atuacao: {
    label: 'Ineficiência',
    bgClass: 'bg-status-warning-bg',
    borderClass: 'border-status-warning/40',
    iconClass: 'text-status-warning',
    badgeClass: 'bg-status-warning-bg text-status-warning border border-status-warning/30',
    color: 'hsl(var(--status-warning))',
    bg: 'hsl(var(--status-warning-bg))',
    border: 'hsl(var(--status-warning) / 0.35)',
    badge: 'bg-status-warning-bg text-status-warning border border-status-warning/30',
    mapColor: 'hsl(var(--risk-medium))',
  },
  oportunidade_estrategica: {
    label: 'Oportunidade',
    bgClass: 'bg-status-info-bg',
    borderClass: 'border-status-info/40',
    iconClass: 'text-status-info',
    badgeClass: 'bg-status-info-bg text-status-info border border-status-info/30',
    color: 'hsl(var(--status-info))',
    bg: 'hsl(var(--status-info-bg))',
    border: 'hsl(var(--status-info) / 0.35)',
    badge: 'bg-status-info-bg text-status-info border border-status-info/30',
    mapColor: 'hsl(var(--risk-strong))',
  },
} as const;
