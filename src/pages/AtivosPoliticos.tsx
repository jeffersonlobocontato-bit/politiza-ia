import { useState } from 'react';
import { Users, Search, Filter } from 'lucide-react';
import { politicalAssets, getAlignmentColor, getAlignmentLabel, getAssetTypeLabel, macroRegions } from '@/data/mockData';

export default function AtivosPoliticos() {
  const [search, setSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState('all');
  const filtered = politicalAssets.filter(a =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.municipality.toLowerCase().includes(search.toLowerCase())) &&
    (macroFilter === 'all' || a.macroregion === macroFilter)
  );
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Users className="w-5 h-5 text-primary" />
        <div><h1 className="text-base font-bold">Ativos Políticos</h1><p className="text-xs text-muted-foreground">{politicalAssets.length} ativos cadastrados</p></div>
      </div>
      <div className="px-6 py-3 border-b border-border flex gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ativo..." className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={macroFilter} onChange={e => setMacroFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">Todas as regiões</option>
          {macroRegions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(asset => {
            const ac = getAlignmentColor(asset.alignmentStatus);
            return (
              <div key={asset.id} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-all" style={{ background: 'var(--gradient-card)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-foreground">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">{asset.position || getAssetTypeLabel(asset.type)}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0" style={{ color: ac, borderColor: `${ac}40`, backgroundColor: `${ac}15` }}>
                    {getAlignmentLabel(asset.alignmentStatus)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{getAssetTypeLabel(asset.type)}</span>
                  <span className="text-[10px] text-muted-foreground">{asset.municipality}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <div><div className="text-[10px] text-muted-foreground">Influência</div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 10 }).map((_, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i < asset.influenceLevel ? ac : 'hsl(var(--border))' }} />)}
                    </div>
                  </div>
                  <div className="text-right"><div className="text-[10px] text-muted-foreground">Status</div><div className="text-xs font-medium text-foreground">{asset.supportStatus}</div></div>
                </div>
                {asset.observations && <div className="mt-2 text-[11px] text-muted-foreground italic border-t border-border pt-2">{asset.observations}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
