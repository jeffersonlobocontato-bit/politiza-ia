import { Navigate } from 'react-router-dom';
import { useCruzamentoMoroAccess } from '@/hooks/useCruzamentoMoroAccess';
import { useAuth } from '@/contexts/AuthContext';
import CruzamentoMoroAdminPanel from '@/components/cruzamento/CruzamentoMoroAdminPanel';
import CruzamentoQualiQuantiMoro from '@/components/cruzamento/CruzamentoQualiQuantiMoro';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

export default function CruzamentoMoroPage() {
  const { canAccess, isMaster, cruzamentoOnly, loading } = useCruzamentoMoroAccess();
  const { signOut, profile, user } = useAuth();

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verificando acesso…
      </div>
    );
  }
  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {cruzamentoOnly && (
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Acesso exclusivo
            </div>
            <div className="text-sm text-foreground">
              {profile?.full_name || user?.email}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Cruzamento Moro</h1>
        <p className="text-sm text-muted-foreground">
          Análise Quali-Quanti restrita — acesso controlado individualmente.
        </p>
      </div>

      {isMaster && <CruzamentoMoroAdminPanel />}

      <CruzamentoQualiQuantiMoro />
    </div>
  );
}
