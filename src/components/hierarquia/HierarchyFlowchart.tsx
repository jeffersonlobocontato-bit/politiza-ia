import { X, User, Crown, Scale, Megaphone, Truck, Calendar, DollarSign, Handshake, FileText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCampaignMembers } from '@/hooks/useCampaignMembers';
import { useCandidate } from '@/contexts/CandidateContext';
import type { DbCampaignMember } from '@/types/database';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Functional department schema (based on the campaign org chart)
interface DeptDef {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string; // CSS var ref
  // role keywords to match a member to this department
  match: (role: string) => boolean;
  children?: DeptDef[];
}

const lc = (s: string) => s.toLowerCase();

const DEPARTMENTS: DeptDef[] = [
  {
    key: 'juridico',
    label: 'Jurídico',
    icon: Scale,
    color: 'hsl(var(--brand-amber))',
    match: r => lc(r).includes('jurídic') || lc(r).includes('juridic') || lc(r).includes('advog'),
  },
  {
    key: 'comunicacao',
    label: 'Comunicação',
    icon: Megaphone,
    color: 'hsl(var(--brand-cyan))',
    match: r => lc(r).includes('comunica') || lc(r).includes('marketing') || lc(r).includes('imprensa'),
  },
  {
    key: 'logistica',
    label: 'Logística',
    icon: Truck,
    color: 'hsl(var(--chart-4))',
    match: r => lc(r).includes('logíst') || lc(r).includes('logist'),
  },
  {
    key: 'agenda',
    label: 'Agenda',
    icon: Calendar,
    color: 'hsl(var(--brand-green))',
    match: r => lc(r).includes('agenda'),
  },
  {
    key: 'financas',
    label: 'Finanças',
    icon: DollarSign,
    color: 'hsl(var(--primary))',
    match: r => lc(r).includes('finan') || lc(r).includes('tesour'),
  },
  {
    key: 'inteligencia',
    label: 'Inteligência Política',
    icon: Handshake,
    color: 'hsl(var(--brand-amber))',
    match: r => {
      const s = lc(r);
      return (s.includes('inteligência') || s.includes('inteligencia')) && (s.includes('polític') || s.includes('politic'));
    },
    children: [
      {
        key: 'pl',
        label: 'PL',
        icon: Handshake,
        color: 'hsl(var(--primary))',
        match: r => /\bpl\b/.test(lc(r)),
      },
      {
        key: 'novo',
        label: 'NOVO',
        icon: Handshake,
        color: 'hsl(var(--brand-amber))',
        match: r => /\bnovo\b/.test(lc(r)),
      },
    ],
  },
  {
    key: 'politica',
    label: 'Coord. Política',
    icon: Handshake,
    color: 'hsl(var(--brand-cyan))',
    match: r => (lc(r).includes('polític') || lc(r).includes('politic')) && !lc(r).includes('plano') && !lc(r).includes('inteligência') && !lc(r).includes('inteligencia'),
    children: [
      {
        key: 'relacoes',
        label: 'Relações Políticas',
        icon: Users,
        color: 'hsl(var(--brand-cyan))',
        match: r => lc(r).includes('relaç') || lc(r).includes('relac') || lc(r).startsWith('r. pl') || lc(r).includes('rel. pol'),
      },
      {
        key: 'mobilizacao',
        label: 'Mobilização',
        icon: Users,
        color: 'hsl(var(--brand-green))',
        match: r => lc(r).includes('mobiliza') || lc(r).includes('articula'),
      },
      {
        key: 'coord_pl',
        label: 'Coordenação do PL',
        icon: Handshake,
        color: 'hsl(var(--primary))',
        match: r => {
          const s = lc(r);
          return (s.includes('coorden') && /\bpl\b/.test(s)) || s.includes('coord. pl') || s.includes('coord pl') || s.includes('coordenação do pl');
        },
      },
      {
        key: 'coord_novo',
        label: 'Coordenação do NOVO',
        icon: Handshake,
        color: 'hsl(var(--brand-amber))',
        match: r => {
          const s = lc(r);
          return (s.includes('coorden') && s.includes('novo')) || s.includes('coord. novo') || s.includes('coord novo') || s.includes('coordenação do novo');
        },
      },
    ],
  },
  {
    key: 'plano',
    label: 'Plano de Governo',
    icon: FileText,
    color: 'hsl(var(--chart-4))',
    match: r => lc(r).includes('plano de governo') || lc(r).includes('programa'),
  },
];

const COORD_GERAL_COLOR = 'hsl(var(--primary))';

function findMember(members: DbCampaignMember[], def: DeptDef): DbCampaignMember | null {
  return members.find(m => def.match(m.role)) ?? null;
}

function findCoordGeral(members: DbCampaignMember[]): DbCampaignMember | null {
  return (
    members.find(m => {
      const r = lc(m.role);
      return r.includes('coorden') && r.includes('geral');
    }) ?? members.find(m => m.hierarchy_level === 2) ?? null
  );
}

// ─── Cards ──────────────────────────────────────────────────────────────────

function DeptCard({
  member,
  label,
  icon: Icon,
  color,
  size = 'md',
}: {
  member: DbCampaignMember | null;
  label: string;
  icon: LucideIcon;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sz =
    size === 'lg'
      ? 'w-[220px] px-4 py-3'
      : size === 'sm'
      ? 'w-[150px] px-2.5 py-2'
      : 'w-[170px] px-3 py-2.5';

  return (
    <div
      className={`${sz} rounded-md border-2 bg-card relative flex-shrink-0`}
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="w-3 h-3" />
        </div>
        <div className="text-[10px] uppercase tracking-wider font-bold truncate" style={{ color }}>
          {label}
        </div>
      </div>
      {member ? (
        <>
          <div className="text-xs font-bold text-foreground truncate">{member.name}</div>
          {member.role && member.role.toLowerCase() !== label.toLowerCase() && (
            <div className="text-[10px] text-muted-foreground truncate">{member.role}</div>
          )}
        </>
      ) : (
        <div className="text-[11px] italic text-muted-foreground/70">Vaga Aberta</div>
      )}
    </div>
  );
}

// Vertical connector line
function VLine({ h = 24 }: { h?: number }) {
  return <div className="w-0.5 mx-auto bg-border" style={{ height: h }} />;
}

// Horizontal bus connecting N children (T-shape, no overlap)
function HorizontalBus({ count, dropH = 18 }: { count: number; dropH?: number }) {
  if (count <= 1) return <VLine />;
  return (
    <div className="relative w-full" style={{ height: 12 + dropH }}>
      <div className="absolute left-1/2 top-0 w-0.5 h-[10px] bg-border -translate-x-1/2" />
      <div
        className="absolute h-0.5 bg-border"
        style={{ top: 10, left: `${100 / (count * 2)}%`, right: `${100 / (count * 2)}%` }}
      />
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 bg-border"
          style={{ top: 10, height: dropH, left: `calc(${((i + 0.5) * 100) / count}% - 1px)` }}
        />
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HierarchyFlowchart({ open, onClose }: Props) {
  const { data: members = [] } = useCampaignMembers();
  const { activeCandidate } = useCandidate();

  const coordGeral = findCoordGeral(members);

  // Build matched data
  const departments = DEPARTMENTS.map(def => ({
    def,
    member: findMember(members, def),
    children: def.children?.map(c => ({ def: c, member: findMember(members, c) })) ?? [],
  }));

  const filledCount = departments.filter(d => d.member).length;
  const totalSlots =
    departments.length + departments.reduce((acc, d) => acc + (d.children?.length ?? 0), 0) + 2;
  const filledSlots =
    filledCount +
    departments.reduce((acc, d) => acc + d.children.filter(c => c.member).length, 0) +
    (coordGeral ? 1 : 0) +
    (activeCandidate ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1100px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
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
              <h2 className="text-sm font-bold text-foreground">Organograma da Campanha</h2>
              <p className="text-[11px] text-muted-foreground">
                {activeCandidate
                  ? `${activeCandidate.name} · ${activeCandidate.cargo} · ${activeCandidate.party}`
                  : 'Estrutura funcional de comando'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Preenchimento</div>
              <div className="text-sm font-bold text-foreground">
                {filledSlots}/{totalSlots}
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({Math.round((filledSlots / totalSlots) * 100)}%)
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Org chart */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          <div className="min-w-[1320px] mx-auto">
            {/* L1 — Candidato */}
            <div className="flex justify-center">
              <div
                className="rounded-xl border-2 px-6 py-3 shadow-lg text-center"
                style={{
                  borderColor: 'hsl(var(--primary))',
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 8px 32px hsl(var(--primary) / 0.35)',
                }}
              >
                <div className="flex items-center gap-2 justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                  <div className="text-sm font-black text-primary-foreground">
                    {activeCandidate?.name ?? 'Candidato'}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-primary-foreground/85 mt-0.5">
                  {activeCandidate?.cargo ?? 'Cargo'}
                </div>
              </div>
            </div>

            <VLine />

            {/* L2 — Coordenação Geral */}
            <div className="flex justify-center">
              <DeptCard
                member={coordGeral}
                label="Coordenação Geral"
                icon={Crown}
                color={COORD_GERAL_COLOR}
                size="lg"
              />
            </div>

            {/* Bus to departments */}
            <HorizontalBus count={departments.length} />

            {/* L3 — Departments */}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${departments.length}, 180px)`, justifyContent: 'center' }}
            >
              {departments.map(({ def, member, children }) => (
                <div key={def.key} className="flex flex-col items-center">
                  <DeptCard member={member} label={def.label} icon={def.icon} color={def.color} />

                  {children.length > 0 && (
                    <>
                      <VLine h={14} />
                      <div className="flex flex-col items-center gap-2">
                        {children.map((c, i) => (
                          <div key={c.def.key} className="flex flex-col items-center">
                            {i > 0 && <VLine h={8} />}
                            <DeptCard
                              member={c.member}
                              label={c.def.label}
                              icon={c.def.icon}
                              color={c.def.color}
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="mt-8 pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Estrutura funcional · cargos vinculados por palavra-chave do papel</span>
              <span>
                Membros sem departamento funcional: <strong className="text-foreground">{
                  members.filter(m =>
                    !DEPARTMENTS.some(d => d.match(m.role) || d.children?.some(c => c.match(m.role))) &&
                    !(lc(m.role).includes('coorden') && lc(m.role).includes('geral'))
                  ).length
                }</strong>
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
