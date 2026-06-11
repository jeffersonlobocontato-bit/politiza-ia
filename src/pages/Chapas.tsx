import { Navigate } from 'react-router-dom';

/**
 * Módulo "Chapas" foi unificado dentro de "Campanha Proporcional".
 * Redireciona para a nova entrada única, mantendo histórico de links externos.
 */
export default function Chapas() {
  return <Navigate to="/proporcional" replace />;
}
