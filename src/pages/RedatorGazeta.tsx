import { Navigate } from 'react-router-dom';
import { useRedatorGazetaAccess } from '@/hooks/useRedatorGazetaAccess';
import { RedatorGazetaChat } from '@/components/redator/RedatorGazetaChat';
import { Loader2 } from 'lucide-react';

export default function RedatorGazetaPage() {
  const { canAccess, loading } = useRedatorGazetaAccess();

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
        <h1 className="text-2xl font-bold">Redator Gazeta</h1>
        <p className="text-sm text-muted-foreground">
          Agente de IA redator, com competências editoriais estilo Gazeta do Povo — gera conteúdo
          persuasivo cruzando emendas parlamentares, ativos políticos, ações de campo e pesquisas
          eleitorais. Acesso exclusivo.
        </p>
      </div>

      <RedatorGazetaChat />
    </div>
  );
}
