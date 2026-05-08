import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface MnButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'primary' | 'secondary' | 'ghost-dark';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export function MnButton({
  variant = 'primary', size = 'md', fullWidth, icon, children, className, type = 'button', ...rest
}: MnButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'mn-btn',
        `mn-btn--${variant}`,
        size === 'sm' && 'mn-btn--sm',
        !fullWidth && variant === 'primary' && 'mn-btn--auto',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
