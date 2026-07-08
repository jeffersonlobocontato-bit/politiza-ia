import { Navigate } from 'react-router-dom';
import { useCruzamentoMoroAccess } from '@/hooks/useCruzamentoMoroAccess';
import CruzamentoMoroAdminPanel from '@/components/cruzamento/CruzamentoMoroAdminPanel';
import CruzamentoQualiQuantiMoro from '@/components/cruzamento/CruzamentoQualiQuantiMoro';
import { Loader2 } from 'lucide-react';

export default function CruzamentoMoroPage() {
  const { canAccess, isMaster, loading } = useCruzamentoMoroAccess();

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
