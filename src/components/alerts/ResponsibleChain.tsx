import { User, UserCheck, Shield, MapPin } from 'lucide-react';

export interface ResponsibleEntry {
  name: string;
  role: string;
  level: 'creator' | 'micro' | 'regional' | 'geral';
}

interface Props {
  entries: ResponsibleEntry[];
  compact?: boolean;
}

const LEVEL_CONFIG: Record<ResponsibleEntry['level'], {
  label: string;
  icon: typeof User;
  badge: string;
  dot: string;
}> = {
  creator: {
    label: 'Quem cadastrou',
    icon: User,
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'hsl(var(--muted-foreground))',
  },
  micro: {
    label: 'Coord. Microrregional',
    icon: MapPin,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'hsl(var(--brand-amber))',
  },
  regional: {
    label: 'Coord. Regional',
    icon: Shield,
    badge: 'bg-primary/10 text-primary border-primary/30',
    dot: 'hsl(var(--primary))',
  },
  geral: {
    label: 'Coord. Geral',
    icon: UserCheck,
    badge: 'bg-brand-red/10 text-brand-red border-brand-red/30',
    dot: 'hsl(var(--brand-red))',
  },
};

export function ResponsibleChain({ entries, compact = false }: Props) {
  if (!entries || entries.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map((e, i) => {
          const cfg = LEVEL_CONFIG[e.level];
          const Icon = cfg.icon;
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}
            >
              <Icon className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="font-semibold">{e.name}</span>
              <span className="opacity-60">· {cfg.label}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
        <UserCheck className="w-3.5 h-3.5" />
        Equipe responsável — acionar para resolver
      </div>
      {entries.map((e, i) => {
        const cfg = LEVEL_CONFIG[e.level];
        const Icon = cfg.icon;
        const isFirst = i === 0;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              isFirst
                ? 'border-primary/25 bg-primary/5'
                : 'border-border bg-muted/20'
            }`}
          >
            {/* level dot */}
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: cfg.dot }}
            />
            {/* icon */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${cfg.dot}20` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: cfg.dot }} />
            </div>
            {/* text */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground leading-tight">{e.name}</div>
              <div className="text-[10px] text-muted-foreground">{e.role}</div>
            </div>
            {/* badge */}
            <span
              className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.badge}`}
            >
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Legacy shim (for any existing callers that still pass old props) ──────────
// Accepts the old prop shape and converts to new entries
interface LegacyProps {
  responsibleName?: string | null;
  responsibleRole?: string | null;
  hierarchyChain?: Array<{ name: string; role: string; level: number }> | null;
  compact?: boolean;
}

export function ResponsibleChainLegacy({ responsibleName, responsibleRole, hierarchyChain, compact }: LegacyProps) {
  const entries: ResponsibleEntry[] = [];
  if (responsibleName) {
    entries.push({ name: responsibleName, role: responsibleRole ?? '', level: 'creator' });
  }
  if (hierarchyChain) {
    for (const node of [...hierarchyChain].sort((a, b) => a.level - b.level)) {
      const level: ResponsibleEntry['level'] =
        node.level <= 2 ? 'geral' : node.level <= 3 ? 'regional' : 'micro';
      entries.push({ name: node.name, role: node.role, level });
    }
  }
  return <ResponsibleChain entries={entries} compact={compact} />;
}
