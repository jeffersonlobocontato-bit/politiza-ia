import { CrossTab, CANDIDATE_COLORS } from '@/data/pollsData';
import { cn } from '@/lib/utils';

interface CrossTabTableProps {
  crossTab: CrossTab;
  highlightCandidate?: string; // highlight one column
}

function getIntensity(value: number, rowValues: number[]): 'high' | 'mid' | 'low' | 'neutral' {
  const sorted = [...rowValues].sort((a, b) => b - a);
  const max = sorted[0];
  const min = sorted[sorted.length - 1];
  const range = max - min;
  if (range < 3) return 'neutral';
  if (value === max) return 'high';
  if (value <= min + range * 0.25) return 'low';
  if (value >= max - range * 0.25) return 'high';
  return 'mid';
}

export function CrossTabTable({ crossTab, highlightCandidate }: CrossTabTableProps) {
  const { candidates, rows } = crossTab;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap min-w-[130px]">
              {crossTab.filterLabel}
            </th>
            {candidates.map(c => (
              <th
                key={c}
                className={cn(
                  'py-2 px-2 text-center font-semibold whitespace-nowrap',
                  highlightCandidate === c ? 'text-primary' : 'text-muted-foreground',
                )}
                style={{ borderLeft: `3px solid ${CANDIDATE_COLORS[c] ?? 'transparent'}` }}
              >
                {c.length > 16 ? c.split(' ').slice(0, 2).join(' ') : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const rowNums = candidates.map(c => row.values[c] ?? 0);
            return (
              <tr
                key={ri}
                className={cn('border-b border-border last:border-0', ri % 2 === 0 ? 'bg-background' : 'bg-muted/20')}
              >
                <td className="py-1.5 px-3 font-medium text-foreground whitespace-nowrap">{row.label}</td>
                {candidates.map((c, ci) => {
                  const val = row.values[c] ?? 0;
                  const intensity = getIntensity(val, rowNums);
                  const isHighlighted = highlightCandidate === c;

                  let cellBg = '';
                  if (intensity === 'high') cellBg = 'bg-brand-green/20';
                  else if (intensity === 'low') cellBg = 'bg-brand-red/20';

                  return (
                    <td
                      key={ci}
                      className={cn(
                        'py-1.5 px-2 text-center font-semibold tabular-nums transition-colors',
                        cellBg,
                        isHighlighted && 'ring-1 ring-inset ring-primary/40',
                        intensity === 'high' ? 'text-brand-green' : intensity === 'low' ? 'text-brand-red' : 'text-foreground',
                      )}
                    >
                      {val > 0 ? `${val.toFixed(1)}%` : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
