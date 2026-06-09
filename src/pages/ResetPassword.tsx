import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    // Listener still useful to capture late PASSWORD_RECOVERY events
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError('Não foi possível atualizar a senha. O link pode ter expirado.');
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(217 91% 55%), transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(189 85% 52%), transparent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <Map className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gradient mb-1">Nova Senha</h1>
          <p className="text-muted-foreground text-sm">Defina uma nova senha de acesso</p>
        </div>

        <div className="rounded-2xl border border-border p-6" style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-card)' }}>
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-brand-green mx-auto" />
              <p className="text-sm font-semibold text-foreground">Senha atualizada com sucesso</p>
              <p className="text-xs text-muted-foreground">Redirecionando para o login...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <label className="text-xs text-muted-foreground block mb-1">Nova senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 bottom-2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Confirmar nova senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-xs text-destructive">{error}</span>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!password || !confirm || loading}
                className="w-full h-11 font-semibold text-sm"
                style={{ background: password && confirm ? 'var(--gradient-primary)' : undefined }}
              >
                {loading ? 'Atualizando...' : 'Atualizar senha'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
