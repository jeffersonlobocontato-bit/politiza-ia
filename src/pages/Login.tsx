import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Map, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect
  if (!authLoading && user) {
    const from = (location.state as any)?.from?.pathname ?? '/';
    navigate(from, { replace: true });
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError('Credenciais inválidas. Verifique e-mail e senha.');
      setLoading(false);
    } else {
      const from = (location.state as any)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(217 91% 55%), transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(189 85% 52%), transparent)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.3 }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <Map className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gradient mb-1">Gestão Eleitoral</h1>
          <p className="text-muted-foreground text-sm">Plataforma de Estratégia Política com IA Integrada</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Shield className="w-3.5 h-3.5 text-brand-green" />
            <span className="text-xs text-brand-green font-medium">Governo do Estado do Paraná — Campanha 2026</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border p-6 animate-fade-in" style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Acesso à Plataforma</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="relative">
              <label className="text-xs text-muted-foreground block mb-1">Senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 bottom-2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-xs text-destructive">{error}</span>
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={!email || !password || loading}
              className="w-full h-11 font-semibold text-sm"
              style={{ background: email && password ? 'var(--gradient-primary)' : undefined }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Autenticando...
                </div>
              ) : (
                'Acessar Plataforma'
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            🔒 Acesso restrito — Campanha Governador do Paraná 2026
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Gestão Eleitoral v2.0 · Backend persistente ativo
        </p>
      </div>
    </div>
  );
}
