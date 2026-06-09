import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Users, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InstallPrompt } from './InstallPrompt';

interface CampoLayoutProps {
  children: ReactNode;
}

const tabs = [
  { to: '/campo/acao', icon: ClipboardCheck, label: 'Ação' },
  { to: '/campo/liderancas', icon: Users, label: 'Lideranças' },
  { to: '/campo/dashboard', icon: BarChart3, label: 'Dashboard' },
];

export function CampoLayout({ children }: CampoLayoutProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name?.trim() || user?.email || 'Liderança';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Compact header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-black text-primary-foreground">PI</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground leading-tight">Politiza IA</div>
            <div className="text-[10px] text-muted-foreground leading-tight truncate">{displayName}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-md"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-auto pb-20">{children}</main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-stretch z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={false}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
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
