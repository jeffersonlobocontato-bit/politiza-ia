import { cn } from '@/lib/utils';

export interface MnRankEntry {
  position: number;
  name: string;
  points: number;
  isSelf?: boolean;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function medalClass(pos: number) {
  if (pos === 1) return 'mn-rank-item--gold';
  if (pos === 2) return 'mn-rank-item--silver';
  if (pos === 3) return 'mn-rank-item--bronze';
  return '';
}

export function MnRankList({ entries }: { entries: MnRankEntry[] }) {
  return (
    <ul className="mn-rank-list">
      {entries.map((e, i) => (
        <li
          key={`${e.position}-${e.name}`}
          className={cn('mn-rank-item', medalClass(e.position), e.isSelf && 'mn-rank-item--self')}
        >
          <span className="mn-rank-item__pos">{e.position}°</span>
          <div className={cn('mn-rank-avatar', i % 2 === 0 ? 'mn-rank-avatar--blue' : 'mn-rank-avatar--green')}>
            {initials(e.name)}
          </div>
          <span className="mn-rank-item__name">{e.name}</span>
          <span className="mn-rank-item__pts">{e.points.toLocaleString('pt-BR')} pts</span>
        </li>
      ))}
    </ul>
  );
}
