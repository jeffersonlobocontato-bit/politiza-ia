import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MnBadgeVariant = 'earn' | 'level' | 'action' | 'achievement';

interface MnBadgeProps {
  variant?: MnBadgeVariant;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}

export function MnBadge({ variant = 'earn', children, pulse, className }: MnBadgeProps) {
  return (
    <span className={cn('mn-badge', `mn-badge--${variant}`, pulse && 'mn-badge-pulse', className)}>
      {children}
    </span>
  );
}
