import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Users, BarChart3, LogOut, Home, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InstallPrompt } from './InstallPrompt';

interface CampoLayoutProps {
  children: ReactNode;
}

const tabs = [
  { to: '/campo', icon: Home, label: 'Início', end: true },
  { to: '/campo/acao', icon: ClipboardCheck, label: 'Ações', end: false },
  { to: '/campo/liderancas', icon: Users, label: 'Lideranças', end: false },
  { to: '/campo/dashboard', icon: BarChart3, label: 'Painel', end: false },
];

export function CampoLayout({ children }: CampoLayoutProps) {
  const { profile, user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isRegional = roles?.includes('coordenador_regional' as any);

  const displayName = profile?.full_name?.trim() || user?.email || 'Liderança';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };


  return (
    <div
      className="campo-app min-h-screen flex flex-col"
      style={{ background: 'var(--campo-grad-bg)' }}
    >
      {/* Compact header (dark navy) */}
      <header
        className="h-12 px-4 flex items-center justify-between flex-shrink-0"
        style={{
          background: 'rgba(10, 15, 31, 0.85)',
          borderBottom: '1px solid var(--campo-line)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--campo-grad-cta)' }}
          >
            <span className="text-[10px] font-black text-white">PI</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold leading-tight" style={{ color: 'var(--campo-text)' }}>
              Politiza IA
            </div>
            <div
              className="text-[10px] leading-tight truncate"
              style={{ color: 'var(--campo-text-mute)' }}
            >
              {displayName}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
          style={{ color: 'var(--campo-text-mute)' }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </header>

      {/* Content */}
      <main
        className="flex-1 min-h-0 overflow-auto pb-20"
        style={{ background: 'var(--campo-grad-bg)' }}
      >
        {children}
      </main>

      {/* Bottom nav (dark) */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-stretch z-40"
        style={{
          background: 'rgba(10, 15, 31, 0.92)',
          borderTop: '1px solid var(--campo-line)',
          backdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--campo-mint-glow)' : 'var(--campo-text-mute)',
            })}
          >
            <t.icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{t.label}</span>
          </NavLink>
        ))}
      </nav>

      <InstallPrompt />
    </div>
  );
}
