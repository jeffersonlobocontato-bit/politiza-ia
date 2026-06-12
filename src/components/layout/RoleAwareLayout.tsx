import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from './AppLayout';
import { CampoLayout } from './CampoLayout';

const GESTOR_OPERACIONAL_ALLOWED = [
  '/', '/pesquisas', '/campo', '/proporcional', '/agenda', '/hierarquia',
];

/**
 * Roteia o usuário para o layout correto e impede que lideranças de campo
 * acessem rotas administrativas (sempre as redireciona para /campo).
 */
export function RoleAwareLayout({ children }: { children: ReactNode }) {
  const { isCampoOperator, isAdmin, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const onCampoRoute = location.pathname.startsWith('/campo');

  if (isCampoOperator) {
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

  return <AppLayout>{children}</AppLayout>;
}
