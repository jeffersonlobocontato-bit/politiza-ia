import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Clock, Sun, Moon, LogOut } from 'lucide-react';
import { alerts } from '@/data/mockData';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [time, setTime] = useState(new Date());
  const unreadAlerts = alerts.filter(a => !a.isRead).length;
  const { theme, setTheme } = useTheme();
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name?.trim() || user?.email || 'Usuário';
  const email = user?.email ?? '';
  const initials = (profile?.full_name || user?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar — white/card background with bottom border */}
          <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-card shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">Sistema Online</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{time.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}</span>
              </div>
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button className="relative p-1.5 rounded-md hover:bg-muted transition-colors">
                <Bell className="w-4 h-4 text-muted-foreground" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-status-error text-white text-[9px] font-bold">
                    {unreadAlerts}
                  </span>
                )}
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-7 h-7 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                      title={displayName}
                    >
                      <span className="text-[10px] font-bold text-primary">{initials}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold truncate">{displayName}</span>
                      {email && <span className="text-xs font-normal text-muted-foreground truncate">{email}</span>}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
