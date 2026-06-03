import { Link } from 'react-router-dom';
import { Smartphone, ClipboardCheck, Users, BarChart3, ArrowRight } from 'lucide-react';

const tools = [
  {
    to: '/campo/acao',
    icon: ClipboardCheck,
    title: 'Registrar Ação de Campo',
    desc: 'Registre execuções de campo (panfletagem, mobilização, visitas) com fotos e geolocalização.',
    cta: 'Registrar Ação',
    accent: 'from-primary/30 to-primary/5',
  },
  {
    to: '/campo/liderancas',
    icon: Users,
    title: 'Cadastrar Liderança de Campo',
    desc: 'Mapeie lideranças por cidade, bairro e segmento. Qualifique com histórico político e eleitoral.',
    cta: 'Abrir Lideranças',
    accent: 'from-secondary/30 to-secondary/5',
  },
];

export default function Campo() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Smartphone className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-base font-bold text-foreground">Campo</h1>
          <p className="text-xs text-muted-foreground">Operação de campo — escolha uma ferramenta</p>
        </div>
        <Link
          to="/campo/dashboard"
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-accent text-foreground transition-colors"
        >
          <BarChart3 className="w-4 h-4" /> Meu Dashboard
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-5">
          {tools.map(t => (
            <Link
              key={t.to}
              to={t.to}
              className={`group relative rounded-2xl border border-border bg-gradient-to-br ${t.accent} p-6 hover:border-primary/50 transition-all hover:-translate-y-1`}
            >
              <div className="w-12 h-12 rounded-xl bg-background/80 border border-border flex items-center justify-center mb-4">
                <t.icon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1.5">{t.title}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5">{t.desc}</p>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                {t.cta} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
