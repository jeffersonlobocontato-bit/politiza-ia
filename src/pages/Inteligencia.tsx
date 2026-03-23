import { Brain, AlertTriangle, Zap, Activity, Info } from 'lucide-react';
import { alerts } from '@/data/mockData';

const levelConfig: Record<string, { icon: any; color: string; label: string }> = {
  critico: { icon: AlertTriangle, color: 'hsl(var(--brand-red))', label: 'CRÍTICO' },
  atencao: { icon: Activity, color: 'hsl(var(--brand-amber))', label: 'ATENÇÃO' },
  oportunidade: { icon: Zap, color: 'hsl(var(--brand-green))', label: 'OPORTUNIDADE' },
  info: { icon: Info, color: 'hsl(var(--primary))', label: 'INFO' },
};

export default function Inteligencia() {
  const criticos = alerts.filter(a => a.level === 'critico');
  const atencao = alerts.filter(a => a.level === 'atencao');
  const oportunidades = alerts.filter(a => a.level === 'oportunidade');

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Brain className="w-5 h-5 text-primary" />
        <div><h1 className="text-base font-bold">Inteligência Estratégica</h1><p className="text-xs text-muted-foreground">Alertas automáticos e recomendações territoriais</p></div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Alertas Críticos', count: criticos.length, color: 'hsl(var(--brand-red))' },
            { label: 'Em Atenção', count: atencao.length, color: 'hsl(var(--brand-amber))' },
            { label: 'Oportunidades', count: oportunidades.length, color: 'hsl(var(--brand-green))' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border p-4 text-center" style={{ background: 'var(--gradient-card)' }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Alert cards */}
        {(['critico', 'atencao', 'oportunidade', 'info'] as const).map(level => {
          const cfg = levelConfig[level];
          const levelAlerts = alerts.filter(a => a.level === level);
          if (!levelAlerts.length) return null;
          return (
            <div key={level}>
              <div className="flex items-center gap-2 mb-3">
                <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{levelAlerts.length}</span>
              </div>
              <div className="space-y-3">
                {levelAlerts.map(alert => (
                  <div key={alert.id} className="rounded-xl border p-4" style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="text-sm font-semibold text-foreground">{alert.title}</div>
                      {!alert.isRead && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold flex-shrink-0">NOVO</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{alert.description}</p>
                    <div className="rounded-lg p-3 border" style={{ borderColor: `${cfg.color}20`, backgroundColor: `${cfg.color}10` }}>
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: cfg.color }}>💡 Recomendação</div>
                      <p className="text-xs text-foreground">{alert.recommendation}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground">📍 {alert.territory}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
