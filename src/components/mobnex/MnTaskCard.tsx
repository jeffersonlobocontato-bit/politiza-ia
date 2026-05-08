import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MnTaskCardProps {
  icon: ReactNode;
  type?: string;
  title: string;
  description?: string;
  earn?: string;
  done?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MnTaskCard({ icon, type, title, description, earn, done, onClick, className }: MnTaskCardProps) {
  return (
    <div
      className={cn('mn-task-card', done && 'mn-task-card--done', className)}
      onClick={done ? undefined : onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="mn-task-card__icon">{icon}</div>
      <div className="mn-task-card__body">
        {type && <span className="mn-task-card__type">{type}</span>}
        <p className="mn-task-card__title">{title}</p>
        {description && <p className="mn-task-card__desc">{description}</p>}
        {earn && <span className="mn-text-earn">GANHE +{earn}</span>}
      </div>
    </div>
  );
}
