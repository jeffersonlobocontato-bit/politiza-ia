import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import raioxBodyHtml from './raiox-body.html?raw';
import raioxScript from './raiox-script.js?raw';
import './raiox.css';

export default function RaioX() {
  const { roles, loading } = useAuth();
  const canAccess = roles.some((r) =>
    ['admin_master', 'coordenador_estadual', 'coordenador_geral'].includes(r),
  );


  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!canAccess) return;

    let cancelled = false;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      (window as any).__raioxAccessToken = session?.access_token ?? '';
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      (window as any).__raioxAccessToken = data.session?.access_token ?? '';

      const script = document.createElement('script');
      script.text = raioxScript;
      document.body.appendChild(script);
      scriptRef.current = script;
    })();

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
      delete (window as any).__raioxAccessToken;
      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [canAccess]);

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="raiox-root raio-x-body" dangerouslySetInnerHTML={{ __html: raioxBodyHtml }} />
  );
}
