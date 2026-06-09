import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'politiza_install_dismissed_v1';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore iOS Safari
    window.navigator.standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);

    // iOS doesn't fire beforeinstallprompt — show manual instructions
    if (isIOS() && !isStandalone()) {
      const t = setTimeout(() => setShowIos(true), 2500);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler as any);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setShowIos(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible && !showIos) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-fade-in">
      <div className="rounded-xl border border-border bg-card shadow-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          {showIos ? <Share className="w-5 h-5 text-primary" /> : <Download className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">Instalar Politiza IA</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {showIos
              ? 'Toque em Compartilhar e em "Adicionar à Tela de Início" para usar como app.'
              : 'Instale no seu celular e acesse como um aplicativo.'}
          </p>
          {visible && !showIos && (
            <button
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Instalar
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dispensar">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
