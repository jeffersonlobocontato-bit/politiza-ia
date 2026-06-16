// Categorias de pins disponíveis para impressão e suas cores (alinhadas a SOURCE_META).

import { SOURCE_META, type GeoSource } from '@/lib/geo';

export type PrintLayerId = GeoSource | 'emendas';

export interface PrintLayerMeta {
  id: PrintLayerId;
  label: string;
  color: string;
  /** rótulo curto para legenda. */
  shortLabel: string;
}

export const PRINT_LAYERS: PrintLayerMeta[] = [
  { id: 'leaders',    label: SOURCE_META.leaders.label,    color: SOURCE_META.leaders.color,    shortLabel: 'Lideranças' },
  { id: 'assets',     label: SOURCE_META.assets.label,     color: SOURCE_META.assets.color,     shortLabel: 'Ativos políticos' },
  { id: 'members',    label: SOURCE_META.members.label,    color: SOURCE_META.members.color,    shortLabel: 'Membros' },
  { id: 'candidates', label: SOURCE_META.candidates.label, color: SOURCE_META.candidates.color, shortLabel: 'Candidatos' },
  { id: 'actions',    label: SOURCE_META.actions.label,    color: SOURCE_META.actions.color,    shortLabel: 'Ações' },
  { id: 'alerts',     label: SOURCE_META.alerts.label,     color: SOURCE_META.alerts.color,     shortLabel: 'Alertas' },
  { id: 'interviews', label: SOURCE_META.interviews.label, color: SOURCE_META.interviews.color, shortLabel: 'Tracking' },
  { id: 'emendas',    label: 'Emendas parlamentares',      color: '#0EA5E9',                    shortLabel: 'Emendas' },
];

export const DEFAULT_PRINT_LAYERS: Record<PrintLayerId, boolean> = {
  leaders: true, assets: true, members: true, candidates: true,
  actions: false, alerts: false, interviews: false, emendas: true,
};
