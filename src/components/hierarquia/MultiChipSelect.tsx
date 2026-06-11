import { X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  label: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyHint?: string;
  color?: string; // hex/hsl base for chips
}

export function MultiChipSelect({
  label,
  options,
  selectedIds,
  onChange,
  emptyHint,
  color = '#3b82f6',
}: Props) {
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

  const selected = options.filter(o => selectedIds.includes(o.id));
  const available = options.filter(o => !selectedIds.includes(o.id));

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground block">{label}</label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border hover:opacity-80"
              style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1a` }}
              title={o.sublabel}
            >
              {o.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 rounded-md border border-dashed border-border">
          {available.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className="text-[11px] px-2 py-0.5 rounded-full border transition-all hover:scale-105"
              style={{ color, borderColor: `${color}30`, backgroundColor: `${color}08` }}
              title={o.sublabel}
            >
              + {o.label}
            </button>
          ))}
        </div>
      ) : selected.length === 0 ? (
        <p className="text-[10px] italic text-muted-foreground">{emptyHint ?? 'Nenhuma opção disponível.'}</p>
      ) : null}
    </div>
  );
}
