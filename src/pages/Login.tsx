import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Map, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const profiles = [
  { id: 'general', label: 'Coordenador Geral', description: 'Acesso total — Sala de Guerra', color: 'hsl(var(--primary))' },
  { id: 'regional', label: 'Coordenador Regional', description: 'Dashboard regional', color: 'hsl(var(--brand-cyan))' },
  { id: 'municipal', label: 'Coordenador Municipal', description: 'Dashboard municipal', color: 'hsl(var(--brand-green))' },
  { id: 'campo', label: 'Operador de Campo', description: 'Input de execução', color: 'hsl(var(--brand-amber))' },
];

export default function Login() {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!selectedProfile) return;
    setLoading(true);
    setTimeout(() => {
      if (selectedProfile === 'campo') {
        navigate('/campo');
      } else {
        navigate('/');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(217 91% 55%), transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsl(189 85% 52%), transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, hsl(217 91% 55%), transparent)' }} />
        {/* Grid lines */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.3 }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--gradient-primary)' }}>
            <Map className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gradient mb-1">CampanhaOS</h1>
          <p className="text-muted-foreground text-sm">Plataforma de Comando e Controle Eleitoral</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Shield className="w-3.5 h-3.5 text-brand-green" />
            <span className="text-xs text-brand-green font-medium">Governo do Estado do Paraná — Campanha 2026</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border p-6 animate-fade-in" style={{ background: 'var(--gradient-card)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Selecione seu perfil</h2>
          
          <div className="grid grid-cols-2 gap-2 mb-5">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setSelectedProfile(profile.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                  selectedProfile === profile.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full mb-2" style={{ backgroundColor: profile.color }} />
                <div className="text-xs font-semibold text-foreground leading-tight">{profile.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{profile.description}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              onClick={handleLogin}
              disabled={!selectedProfile || loading}
              className="w-full h-11 font-semibold text-sm"
              style={{ background: selectedProfile ? 'var(--gradient-primary)' : undefined }}
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
          CampanhaOS v1.0 · Dados de demonstração
        </p>
      </div>
    </div>
  );
}
