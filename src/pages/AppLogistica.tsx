import { Package, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import DistribuicaoMaterial from '@/pages/DistribuicaoMaterial';

/**
 * App enxuto de logística: acesso exclusivo ao módulo de Distribuição de Material.
 * Sem menu lateral — pensado para o responsável pela logística e para quem entrega
 * material na gráfica lançar as entregas (com foto do kit) direto do celular.
 */
export default function AppLogistica() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none truncate">Logística de Material</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile?.full_name ?? 'Equipe de logística'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="pb-16 max-w-full overflow-x-hidden">
        <DistribuicaoMaterial />
      </main>

    </div>
  );
}
