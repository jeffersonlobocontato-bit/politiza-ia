import { MnBadge } from './MnBadge';
import { MnMetricCard } from './MnMetricCard';

export interface MnProfileRow { label: string; value: string; }

interface MnProfileCardProps {
  name: string;
  location?: string;
  level?: string;
  initials?: string;
  stats?: { label: string; value: string | number }[];
  rows?: MnProfileRow[];
}

function makeInitials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export function MnProfileCard({ name, location, level, initials, stats = [], rows = [] }: MnProfileCardProps) {
  return (
    <div className="mn-profile-card">
      <div className="mn-profile-card__header">
        <div className="mn-rank-avatar mn-rank-avatar--blue" style={{ width: 44, height: 44, fontSize: 14 }}>
          {initials ?? makeInitials(name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="mn-profile-card__name">{name}</span>
          {location && <span className="mn-profile-card__location">{location}</span>}
        </div>
        {level && <MnBadge variant="level">{level}</MnBadge>}
      </div>

      {stats.length > 0 && (
        <div className="mn-profile-card__stats">
          {stats.map((s) => (
            <MnMetricCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}

      {rows.map((r) => (
        <div key={r.label} className="mn-profile-card__row">
          <span className="mn-profile-card__row-label">{r.label}</span>
          <span className="mn-profile-card__row-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
