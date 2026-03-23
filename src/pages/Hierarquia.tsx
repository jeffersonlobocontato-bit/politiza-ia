import { Network, Award } from 'lucide-react';
import { teamMembers } from '@/data/mockData';

const levelColors: Record<number, string> = { 1: 'hsl(var(--brand-amber))', 2: 'hsl(var(--primary))', 3: 'hsl(var(--brand-cyan))', 4: 'hsl(var(--brand-green))', 5: 'hsl(var(--muted-foreground))' };
const levelLabels: Record<number, string> = { 1: 'Comando Estadual', 2: 'Coordenação Macrorregional', 3: 'Coordenação Microrregional', 4: 'Coordenação Municipal', 5: 'Lideranças Locais' };

export default function Hierarquia() {
  const byLevel = [1, 2, 3, 4, 5].map(l => ({ level: l, members: teamMembers.filter(m => m.level === l) }));
  const ranked = [...teamMembers].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Network className="w-5 h-5 text-primary" />
        <div><h1 className="text-base font-bold">Hierarquia da Campanha</h1><p className="text-xs text-muted-foreground">{teamMembers.length} membros cadastrados em 5 níveis</p></div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {byLevel.map(({ level, members }) => members.length > 0 && (
          <div key={level}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: levelColors[level] }}>
                {level}
              </div>
              <span className="text-sm font-semibold text-foreground">{levelLabels[level]}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(m => (
                <div key={m.id} className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: `${levelColors[level]}20`, color: levelColors[level] }}>
                      {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><div className="text-[10px] text-muted-foreground">Ações</div><div className="text-base font-black text-foreground">{m.actionsManaged}</div></div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Execução</div>
                      <div className="text-base font-black" style={{ color: m.completionRate >= 70 ? '#22c55e' : m.completionRate >= 50 ? '#f59e0b' : '#ef4444' }}>{m.completionRate}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Ranking */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-brand-amber" />
            <span className="text-sm font-semibold text-foreground">Ranking de Desempenho</span>
          </div>
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--gradient-card)' }}>
            {ranked.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-4 px-4 py-3 ${i < ranked.length - 1 ? 'border-b border-border' : ''}`}>
                <span className={`text-sm font-black w-5 flex-shrink-0 ${i === 0 ? 'text-brand-amber' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-brand-amber/60' : 'text-muted-foreground/50'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{m.role}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.completionRate}%`, backgroundColor: m.completionRate >= 70 ? '#22c55e' : m.completionRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="text-xs font-bold text-foreground w-8 text-right">{m.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
