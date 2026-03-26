import { User, ChevronRight, UserCheck } from 'lucide-react';
import type { HierarchyNode } from '@/types/database';

interface Props {
  responsibleName: string | null;
  responsibleRole: string | null;
  hierarchyChain: HierarchyNode[] | null;
  compact?: boolean;
}

export function ResponsibleChain({ responsibleName, responsibleRole, hierarchyChain, compact = false }: Props) {
  if (!responsibleName && (!hierarchyChain || hierarchyChain.length === 0)) return null;

  const chain = hierarchyChain ?? [];
  // Sort by level descending (highest authority first)
  const sorted = [...chain].sort((a, b) => a.level - b.level);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <UserCheck className="w-3 h-3 text-primary flex-shrink-0" />
        {responsibleName && (
          <span className="text-[10px] font-semibold text-foreground bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full">
            {responsibleName}
            {responsibleRole && <span className="font-normal text-muted-foreground ml-1">({responsibleRole})</span>}
          </span>
        )}
        {sorted.length > 0 && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            {sorted.map((node, i) => (
              <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {node.name}
              </span>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5" />
        Responsável &amp; Cadeia de Comando
      </div>

      {/* Direct responsible */}
      {responsibleName && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/25 bg-primary/5">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground leading-tight">{responsibleName}</div>
            {responsibleRole && (
              <div className="text-xs text-primary font-medium">{responsibleRole}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-0.5">Responsável direto — deve ser acionado</div>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              ACIONAR
            </span>
          </div>
        </div>
      )}

      {/* Hierarchy chain */}
      {sorted.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
            Cadeia hierárquica acima
          </div>
          {sorted.map((node, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-muted/30"
              style={{ paddingLeft: `${12 + i * 12}px` }}
            >
              {i > 0 && (
                <div className="absolute left-3 flex flex-col items-center">
                  <div className="w-px h-2 bg-border" />
                </div>
              )}
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground">{node.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{node.role}</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Nível {node.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!responsibleName && sorted.length === 0 && (
        <div className="text-xs text-muted-foreground italic p-3 rounded-lg bg-muted/30 border border-border">
          Nenhum responsável definido para este alerta.
        </div>
      )}
    </div>
  );
}
