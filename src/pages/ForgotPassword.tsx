import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError('Informe seu e-mail.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError('Não foi possível enviar. Verifique o e-mail e tente novamente.');
    } else {
      setSent(true);
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
          <h1 className="text-3xl font-black text-gradient mb-1">Recuperar Senha</h1>
          <p className="text-muted-foreground text-sm">Enviaremos um link para redefinir sua senha</p>
        </div>

        <div className="rounded-2xl border border-border p-6" style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-card)' }}>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-brand-green mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">E-mail enviado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verifique sua caixa de entrada em <strong>{email}</strong> e siga o link recebido.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 text-xs text-brand-blue hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
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
                disabled={!email || loading}
                className="w-full h-11 font-semibold text-sm"
                style={{ background: email ? 'var(--gradient-primary)' : undefined }}
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>

              <Link to="/login" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
