import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from './AppLayout';
import { CampoLayout } from './CampoLayout';

/**
 * Roteia o usuário para o layout correto e impede que lideranças de campo
 * acessem rotas administrativas (sempre as redireciona para /campo).
 */
export function RoleAwareLayout({ children }: { children: ReactNode }) {
  const { isCampoOperator, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const onCampoRoute = location.pathname.startsWith('/campo');

  if (isCampoOperator) {
    if (!onCampoRoute) {
      return <Navigate to="/campo" replace />;
    }
    return <CampoLayout>{children}</CampoLayout>;
  }

  return <AppLayout>{children}</AppLayout>;
}
