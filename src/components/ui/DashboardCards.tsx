import type { LucideIcon } from 'lucide-react';

export const CHART_COLORS = [
  '#0FFCBE', '#106EBE', '#7B61FF', '#FBC02D', '#E53935',
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c',
];

export const GRADIENT_CARDS = [
  { bg: 'from-[hsl(210,84%,30%)] to-[hsl(210,84%,45%)]', icon: 'text-blue-200' },
  { bg: 'from-[hsl(163,97%,35%)] to-[hsl(163,60%,45%)]', icon: 'text-emerald-200' },
  { bg: 'from-[hsl(280,70%,45%)] to-[hsl(310,60%,50%)]', icon: 'text-purple-200' },
  { bg: 'from-[hsl(210,84%,25%)] to-[hsl(220,60%,40%)]', icon: 'text-cyan-200' },
  { bg: 'from-[hsl(45,90%,45%)] to-[hsl(35,85%,50%)]', icon: 'text-amber-200' },
  { bg: 'from-[hsl(0,70%,45%)] to-[hsl(10,65%,50%)]', icon: 'text-red-200' },
];

export const tooltipStyle = {
  backgroundColor: 'hsl(220, 18%, 16%)',
  border: '1px solid hsl(220, 15%, 25%)',
  borderRadius: 10,
  fontSize: 12,
  color: '#fff',
};

export const GRID_STROKE = 'hsl(220,15%,22%)';
export const AXIS_TICK_LIGHT = { fontSize: 11, fill: '#8899aa' };
export const AXIS_TICK_LABEL = { fontSize: 12, fill: '#dde4ec' };
export const LEGEND_STYLE = { fontSize: 11, color: '#dde4ec' };

export function KpiCard({ title, value, subtitle, icon: Icon, gradientIndex }: {
  title: string; value: string | number; subtitle?: string; icon: LucideIcon; gradientIndex: number;
}) {
  const g = GRADIENT_CARDS[gradientIndex % GRADIENT_CARDS.length];
  return (
    <div className={`relative rounded-xl bg-gradient-to-br ${g.bg} p-5 overflow-hidden shadow-lg`}>
      <div className="absolute top-3 right-3 opacity-20">
        <Icon className={`w-12 h-12 ${g.icon}`} />
      </div>
      <p className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-white">{value}</p>
      {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
    </div>
  );
}

export function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-[hsl(220,20%,13%)] border border-[hsl(220,15%,20%)] shadow-lg overflow-hidden ${className}`}>
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
