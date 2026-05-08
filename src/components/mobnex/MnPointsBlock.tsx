import { cn } from '@/lib/utils';

interface MnPointsBlockProps {
  label?: string;
  level?: string;
  points: number;
  nextLevelAt?: number;
  fillVariant?: 'green' | 'blue';
  className?: string;
}

export function MnPointsBlock({
  label = 'Sua Pontuação', level, points, nextLevelAt, fillVariant = 'green', className,
}: MnPointsBlockProps) {
  const pct = nextLevelAt ? Math.min(100, Math.round((points / nextLevelAt) * 100)) : 100;
  return (
    <div className={cn('mn-points-block', className)}>
      <span className="mn-points-block__label">{label}</span>
      {level && <span className="mn-points-block__sublabel">{level}</span>}
      <div className="mn-points-block__value">{points.toLocaleString('pt-BR')} pts</div>
      <div className="mn-progress">
        <div
          className={cn('mn-progress__fill', fillVariant === 'blue' && 'mn-progress__fill--blue')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextLevelAt && (
        <div className="mn-progress__range">
          <span>0</span>
          <span>{nextLevelAt.toLocaleString('pt-BR')}</span>
        </div>
      )}
    </div>
  );
}
