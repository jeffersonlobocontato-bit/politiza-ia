import type { LucideIcon } from 'lucide-react';

export const CHART_COLORS = [
  '#2FA85A', '#1F5AB4', '#0FFCBE', '#FBC02D', '#E53935',
  '#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb923c',
];

/**
 * MobNex card variants — fundo navy/card uniforme com acento por índice.
 * Mantém shape { bg, icon } para compatibilidade. `bg` agora aplica o card MobNex
 * (cores semânticas), e `accent` é a cor do ícone/realce.
 */
export const GRADIENT_CARDS = [
  { bg: 'from-card to-card border border-border/60', icon: 'text-primary',          accent: 'hsl(var(--primary))' },
  { bg: 'from-card to-card border border-border/60', icon: 'text-brand-green',      accent: 'hsl(var(--brand-green))' },
  { bg: 'from-card to-card border border-border/60', icon: 'text-brand-purple',     accent: 'hsl(var(--brand-purple))' },
  { bg: 'from-card to-card border border-border/60', icon: 'text-brand-blue',       accent: 'hsl(var(--brand-blue))' },
  { bg: 'from-card to-card border border-border/60', icon: 'text-brand-amber',      accent: 'hsl(var(--brand-amber))' },
  { bg: 'from-card to-card border border-border/60', icon: 'text-brand-red',        accent: 'hsl(var(--brand-red))' },
];

export const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

export const GRID_STROKE = 'hsl(var(--border))';
export const AXIS_TICK_LIGHT = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
export const AXIS_TICK_LABEL = { fontSize: 12, fill: 'hsl(var(--foreground))' };
export const LEGEND_STYLE = { fontSize: 11, color: 'hsl(var(--foreground))' };

export function KpiCard({ title, value, subtitle, icon: Icon, gradientIndex }: {
  title: string; value: string | number; subtitle?: string; icon: LucideIcon; gradientIndex: number;
}) {
  const g = GRADIENT_CARDS[gradientIndex % GRADIENT_CARDS.length];
  return (
    <div className={`relative rounded-lg bg-gradient-to-br ${g.bg} p-5 overflow-hidden shadow-card`}>
      <div className="absolute top-3 right-3 opacity-30">
        <Icon className={`w-10 h-10 ${g.icon}`} />
      </div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: g.accent }} />
    </div>
  );
}

export function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-card border border-border/60 shadow-card overflow-hidden ${className}`}>
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
