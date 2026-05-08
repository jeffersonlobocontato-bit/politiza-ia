import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MnMetricCardProps {
  label: string;
  value: string | number;
  action?: ReactNode;
  className?: string;
}

export function MnMetricCard({ label, value, action, className }: MnMetricCardProps) {
  return (
    <div className={cn('mn-metric-card', action && 'mn-metric-card--with-action', className)}>
      <span className="mn-metric-card__label">{label}</span>
      <span className="mn-metric-card__value">{value}</span>
      {action && <div className="mn-metric-card__action">{action}</div>}
    </div>
  );
}

export function MnMetricGrid({ children }: { children: ReactNode }) {
  return <div className="mn-metric-grid">{children}</div>;
}
