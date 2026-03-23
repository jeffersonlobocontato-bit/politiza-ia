import { useState } from 'react';
import { Globe, ChevronRight, TrendingUp, TrendingDown, Minus, Users, Activity } from 'lucide-react';
import { macroRegions, municipalities, getEngagementColor, getEngagementLevel } from '@/data/mockData';

const EngagementBadge = ({ score }: { score: number }) => {
  const level = getEngagementLevel(score);
  const color = getEngagementColor(score);
  const labels = { risco: 'RISCO', atencao: 'ATENÇÃO', competitivo: 'COMPETITIVO', consolidado: 'CONSOLIDADO' };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}>
      {labels[level]}
    </span>
  );
};

export default function Territorios() {
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);

  const selectedRegion = macroRegions.find(m => m.id === selectedMacro);
  const regionMunicipalities = municipalities.filter(m => m.macroregion === selectedMacro);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Gestão Territorial</h1>
            <p className="text-xs text-muted-foreground">Estado → Macrorregiões → Microrregiões → Municípios</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* State KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Macrorregiões', value: '8', icon: Globe, color: 'hsl(var(--primary))' },
            { label: 'Municípios', value: '399', icon: Activity, color: 'hsl(var(--brand-cyan))' },
            { label: 'Municípios Cobertos', value: '287', icon: Activity, color: 'hsl(var(--brand-green))' },
            { label: 'Engajamento Médio', value: '61/100', icon: TrendingUp, color: 'hsl(var(--brand-amber))' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border p-4" style={{ background: 'var(--gradient-card)' }}>
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-xl font-black text-foreground">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <button onClick={() => setSelectedMacro(null)} className="text-primary hover:underline font-medium">
            Paraná
          </button>
          {selectedMacro && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{selectedRegion?.name}</span>
            </>
          )}
        </div>

        {!selectedMacro ? (
          /* Macro Regions Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {macroRegions.map(region => {
              const rate = Math.round((region.actionsCompleted / region.actionsPlanned) * 100);
              const color = getEngagementColor(region.engagementScore);
              return (
                <button
                  key={region.id}
                  onClick={() => setSelectedMacro(region.id)}
                  className="rounded-xl border border-border p-4 text-left hover:border-primary/50 transition-all hover:scale-[1.02] group"
                  style={{ background: 'var(--gradient-card)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                      <Globe className="w-5 h-5" style={{ color }} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="font-bold text-sm text-foreground mb-1">{region.name}</div>
                  <div className="text-xs text-muted-foreground mb-3">{region.municipalities} municípios · {region.coordinator}</div>

                  {/* Score */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Engajamento</span>
                      <span className="text-sm font-black" style={{ color }}>{region.engagementScore}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${region.engagementScore}%`, backgroundColor: color }} />
                    </div>
                  </div>

                  <EngagementBadge score={region.engagementScore} />

                  <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Pesquisa</div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1">
                        {region.pollScore}%
                        {region.pollTrend === 'up' ? <TrendingUp className="w-3 h-3 text-brand-green" /> : region.pollTrend === 'down' ? <TrendingDown className="w-3 h-3 text-brand-red" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Execução</div>
                      <div className="text-sm font-bold text-foreground">{rate}%</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Municipality list for selected region */
          <div>
            <div className="rounded-xl border border-border p-4 mb-4" style={{ background: 'var(--gradient-card)' }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Coordenador</div>
                  <div className="text-sm font-semibold text-foreground">{selectedRegion?.coordinator}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Municípios</div>
                  <div className="text-sm font-semibold text-foreground">{selectedRegion?.municipalities}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Score Engajamento</div>
                  <div className="text-sm font-semibold" style={{ color: getEngagementColor(selectedRegion?.engagementScore || 0) }}>
                    {selectedRegion?.engagementScore}/100
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Intenção de Voto</div>
                  <div className="text-sm font-semibold text-brand-green">{selectedRegion?.pollScore}%</div>
                </div>
              </div>
            </div>

            {regionMunicipalities.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground mb-3">Municípios com dados ({regionMunicipalities.length})</h3>
                {regionMunicipalities.map(m => {
                  const rate = Math.round((m.actionsCompleted / m.actionsPlanned) * 100);
                  const color = getEngagementColor(m.engagementScore);
                  return (
                    <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors" style={{ background: 'var(--gradient-card)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <span className="text-xs font-bold" style={{ color }}>{m.engagementScore}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{m.name}</span>
                          <EngagementBadge score={m.engagementScore} />
                        </div>
                        <div className="text-xs text-muted-foreground">{m.microregion} · {m.electoralVoters.toLocaleString()} eleitores</div>
                      </div>
                      <div className="hidden sm:grid grid-cols-3 gap-6 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">Ações</div>
                          <div className="text-sm font-bold text-foreground">{m.actionsCompleted}/{m.actionsPlanned}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Impactados</div>
                          <div className="text-sm font-bold text-foreground">{(m.peopleImpacted / 1000).toFixed(0)}k</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Pesquisa</div>
                          <div className="text-sm font-bold" style={{ color: m.pollScore && m.pollScore > 44 ? '#22c55e' : '#f59e0b' }}>{m.pollScore}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Dados detalhados dos municípios em carregamento.</p>
                <p className="text-xs mt-1">Esta macrorregião tem {selectedRegion?.municipalities} municípios cadastrados.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
