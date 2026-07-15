import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCruzamentoMoroAccess } from '@/hooks/useCruzamentoMoroAccess';
import { AppLayout } from './AppLayout';
import { CampoLayout } from './CampoLayout';


const GESTOR_OPERACIONAL_ALLOWED = [
  '/', '/pesquisas', '/campo', '/proporcional', '/agenda', '/hierarquia',
];

const AUDITOR_HIERARQUIA_ALLOWED = [
  '/hierarquia', '/gestao', '/mapa', '/agenda', '/meus-cadastros',
  '/ativos', '/proporcional', '/territorios', '/municipios',
  '/produtividade', '/eventos', '/acoes', '/chapas',
];

/**
 * Roteia o usuário para o layout correto e impede que lideranças de campo
 * acessem rotas administrativas (sempre as redireciona para /campo).
 */
export function RoleAwareLayout({ children }: { children: ReactNode }) {
  const { isCampoOperator, isAdmin, isAuditorHierarquia, roles, loading } = useAuth();
  const { cruzamentoOnly, loading: cruzLoading } = useCruzamentoMoroAccess();
  const location = useLocation();

  if (loading || cruzLoading) return null;

  // Usuário com acesso exclusivo ao Cruzamento Moro — nenhuma outra rota.
  if (cruzamentoOnly) {
    if (location.pathname !== '/inteligencia/cruzamento-moro') {
      return <Navigate to="/inteligencia/cruzamento-moro" replace />;
    }
    return <div className="min-h-screen bg-background">{children}</div>;
  }



  const onCampoRoute = location.pathname.startsWith('/campo');
  const onConfigRoute = location.pathname.startsWith('/configuracoes');
  const isRegional = roles?.includes('coordenador_regional' as any);

  if (isCampoOperator) {
    // Coordenador Regional pode gerenciar usuários em /configuracoes
    if (isRegional && onConfigRoute) {
      return <AppLayout>{children}</AppLayout>;
    }
    if (!onCampoRoute) {
      return <Navigate to="/campo" replace />;
    }
    return <CampoLayout>{children}</CampoLayout>;
  }


  const isGestorOperacional = !isAdmin && roles?.includes('gestor_operacional' as any);
  if (isGestorOperacional) {
    const allowed = GESTOR_OPERACIONAL_ALLOWED.some(
      p => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
    );
    if (!allowed) return <Navigate to="/" replace />;
  }

  // Auditor de Hierarquia: leitura restrita a um conjunto de módulos.
  if (!isAdmin && isAuditorHierarquia) {
    const allowed = AUDITOR_HIERARQUIA_ALLOWED.some(p => location.pathname.startsWith(p));
    if (!allowed) return <Navigate to="/hierarquia" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}
