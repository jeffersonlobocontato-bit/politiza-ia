import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserParty } from '@/hooks/useUserParty';
import { useAllPartySlates, type SlateParty } from '@/hooks/usePartySlate';
import { Card } from '@/components/ui/card';
import { UsersRound, ArrowRight, ShieldAlert } from 'lucide-react';

const PARTY_META: Record<SlateParty, { label: string; tagline: string; color: string }> = {
  PL: { label: 'PL — Partido Liberal', tagline: 'Chapa proporcional do PL no Paraná', color: 'from-blue-600/30 to-blue-900/10' },
  Novo: { label: 'Novo', tagline: 'Chapa proporcional do Partido Novo', color: 'from-orange-500/30 to-orange-900/10' },
};

const fmt = (n: number) => n.toLocaleString('pt-BR');

export default function Chapas() {
  const { isAdmin } = useAuth();
  const { party: userParty, isPartyManager } = useUserParty();
  const { data: all = [], isLoading } = useAllPartySlates();

  const allowedParties: SlateParty[] = isAdmin
    ? ['PL', 'Novo']
    : isPartyManager && userParty
      ? [userParty]
      : [];

  if (!isAdmin && !isPartyManager) {
    return (
      <div className="p-8 max-w-2xl">
        <Card className="p-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <div className="font-semibold">Acesso restrito</div>
            <p className="text-sm text-muted-foreground mt-1">
              O módulo de Chapas é restrito a administradores da plataforma e gestores estaduais de partido.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Chapas Proporcionais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Base centralizada de pré-candidatos a Deputado Federal e Estadual por partido.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {allowedParties.map((p) => {
            const rows = all.filter(r => r.party === p);
            const fed = rows.filter(r => r.cargo === 'Deputado Federal');
            const est = rows.filter(r => r.cargo === 'Deputado Estadual');
            const totalBom = rows.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
            const meta = PARTY_META[p];
            return (
              <Link
                key={p}
                to={`/chapas/${p}`}
                className="group block"
              >
                <Card className={`relative overflow-hidden border-border p-6 hover:border-primary/60 transition-all bg-gradient-to-br ${meta.color}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Partido</div>
                      <div className="text-xl font-black mt-1">{meta.label}</div>
                      <p className="text-xs text-muted-foreground mt-1">{meta.tagline}</p>
                    </div>
                    <UsersRound className="w-6 h-6 text-primary/80" />
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <Stat label="Federal" value={fed.length} />
                    <Stat label="Estadual" value={est.length} />
                    <Stat label="Projeção (Bom)" value={fmt(totalBom)} />
                  </div>

                  <div className="mt-5 flex items-center text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                    Abrir chapa <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-background/60 border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}
