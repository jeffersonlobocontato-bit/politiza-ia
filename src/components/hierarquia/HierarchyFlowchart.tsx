import { X, User, Crown } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import { useCandidate } from '@/contexts/CandidateContext';
import type { DbCampaignMember } from '@/types/database';

const LEVEL_COLORS: Record<number, string> = {
  1: 'hsl(var(--brand-amber))',
  2: 'hsl(var(--primary))',
  3: 'hsl(var(--brand-cyan))',
  4: 'hsl(var(--brand-green))',
  5: 'hsl(var(--chart-4))',
  6: 'hsl(var(--muted-foreground))',
};
const LEVEL_LABELS: Record<number, string> = {
  1: 'Comando Estadual',
  2: 'Coordenação Setorial',
  3: 'Coord. Macrorregional',
  4: 'Coord. Microrregional',
  5: 'Coord. Municipal',
  6: 'Lideranças Locais',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

function NodeCard({ member, color }: { member: DbCampaignMember | null; color: string }) {
  if (!member) {
    return (
      <div
        className="min-w-[150px] max-w-[180px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-center"
      >
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Vaga Aberta</div>
      </div>
    );
  }
  return (
    <div
      className="min-w-[150px] max-w-[180px] rounded-lg border bg-card px-3 py-2 shadow-sm"
      style={{ borderColor: `${color}55`, boxShadow: `0 0 0 1px ${color}22` }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="text-[11px] font-bold text-foreground truncate">{member.name}</div>
      </div>
      <div className="text-[10px] text-muted-foreground truncate">{member.role}</div>
      {(member.municipality || member.microregion) && (
        <div className="text-[9px] text-muted-foreground/80 truncate mt-0.5">
          {member.municipality ?? member.microregion}
        </div>
      )}
    </div>
  );
}

function LevelRow({ level, members, isLast }: { level: number; members: DbCampaignMember[]; isLast: boolean }) {
  const color = LEVEL_COLORS[level];
  const cards = members.length > 0 ? members : [null];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white"
          style={{ backgroundColor: color }}
        >
          {level}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {LEVEL_LABELS[level]}
        </span>
        <span className="text-[10px] text-muted-foreground">({members.length})</span>
      </div>

      {/* Cards row */}
      <div className="flex flex-wrap items-stretch justify-center gap-2 px-2">
        {cards.map((m, i) => (
          <NodeCard key={m?.id ?? `empty-${i}`} member={m} color={color} />
        ))}
      </div>

      {/* Connector */}
      {!isLast && (
        <div className="flex flex-col items-center" aria-hidden>
          <div className="w-px h-6 bg-gradient-to-b from-border to-border/30" />
          <div className="w-2 h-2 rotate-45 border-r border-b border-border/60 -mt-1" />
        </div>
      )}
    </div>
  );
}

export function HierarchyFlowchart({ open, onClose }: Props) {
  const { data: members = [] } = useCampaignMembers();
  const { activeCandidate } = useCandidate();

  const byLevel = [1, 2, 3, 4, 5, 6].map(l => ({
    level: l,
    members: members.filter(m => m.hierarchy_level === l),
  }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Fluxograma da Hierarquia</h2>
              <p className="text-[11px] text-muted-foreground">
                {activeCandidate ? `Candidato: ${activeCandidate.name} · ${activeCandidate.cargo}` : 'Estrutura de comando da campanha'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Candidate root + flow */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          {/* Candidate Root */}
          <div className="flex flex-col items-center mb-3">
            <div
              className="rounded-xl border-2 px-5 py-3 shadow-lg text-center"
              style={{
                borderColor: 'hsl(var(--primary))',
                background: 'var(--gradient-primary)',
              }}
            >
              <div className="flex items-center gap-2 justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
                <div className="text-sm font-black text-primary-foreground">
                  {activeCandidate?.name ?? 'Candidato'}
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/80 mt-0.5">
                {activeCandidate?.cargo ?? 'Cargo'} · {activeCandidate?.party ?? '—'}
              </div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="w-2 h-2 rotate-45 border-r border-b border-border/60 -mt-1" />
          </div>

          {/* Levels */}
          <div className="space-y-1">
            {byLevel.map((row, idx) => (
              <LevelRow
                key={row.level}
                level={row.level}
                members={row.members}
                isLast={idx === byLevel.length - 1}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {[1, 2, 3, 4, 5, 6].map(l => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLORS[l] }} />
                <span className="text-[10px] text-muted-foreground">{LEVEL_LABELS[l]}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
