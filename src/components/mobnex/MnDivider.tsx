import { cn } from '@/lib/utils';

interface MnDividerProps {
  variant?: 'gradient' | 'green' | 'short';
  className?: string;
}

export function MnDivider({ variant = 'gradient', className }: MnDividerProps) {
  if (variant === 'short') return <div className={cn('mn-divider-short', className)} />;
  return <hr className={cn('mn-divider', variant === 'green' && 'mn-divider--green', className)} />;
}
