import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar
} from '@/components/ui/sidebar';
import {
  Crosshair, Map, Globe, ClipboardList, Smartphone,
  Users, BarChart2, Brain, Network, Settings, ShieldCheck, AlertTriangle, User, ShieldAlert
} from 'lucide-react';
import { useCandidate } from '@/contexts/CandidateContext';

const navItems = [
  { title: 'Sala de Guerra', url: '/', icon: Crosshair },
  { title: 'Sala de Crise', url: '/sala-de-crise', icon: ShieldAlert, highlight: true },
  { title: 'Mapa Estratégico', url: '/mapa', icon: Map },
  { title: 'Territórios', url: '/territorios', icon: Globe },
  { title: 'Ações', url: '/acoes', icon: ClipboardList },
  { title: 'Campo', url: '/campo', icon: Smartphone },
  { title: 'Alertas', url: '/alertas', icon: AlertTriangle },
  { title: 'Ativos Políticos', url: '/ativos', icon: Users },
  { title: 'Pesquisas', url: '/pesquisas', icon: BarChart2 },
  { title: 'Inteligência', url: '/inteligencia', icon: Brain },
  { title: 'Hierarquia', url: '/hierarquia', icon: Network },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { activeCandidate } = useCandidate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Crosshair className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-black text-sm text-gradient">Gestão Eleitoral</div>
              <div className="text-[10px] text-sidebar-foreground/50 leading-none mt-0.5">Plataforma de Estratégia Política com IA Integrada</div>
            </div>
          )}
        </div>

        <SidebarGroup className="py-3">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-4 mb-1">
              Módulos
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                const isHighlight = (item as any).highlight;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                          collapsed ? 'justify-center px-2' : ''
                        } ${
                          isActive
                            ? 'bg-primary/15 text-primary font-semibold'
                            : isHighlight
                            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}
                        activeClassName=""
                      >
                        <item.icon className={`flex-shrink-0 w-4 h-4 ${isActive ? 'text-primary' : isHighlight ? 'text-red-400' : ''}`} />
                        {!collapsed && <span>{item.title}</span>}
                        {!collapsed && isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        {!collapsed && !isActive && isHighlight && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Candidate / User profile bottom */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20 flex-shrink-0 overflow-hidden">
                {activeCandidate?.photo_url
                  ? <img src={activeCandidate.photo_url} alt={activeCandidate.name} className="w-full h-full object-cover" />
                  : <ShieldCheck className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0">
                {activeCandidate ? (
                  <>
                    <div className="text-xs font-semibold text-sidebar-foreground truncate">{activeCandidate.name}</div>
                    <div className="text-[10px] text-sidebar-foreground/50 truncate">{activeCandidate.cargo} · {activeCandidate.party}</div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-sidebar-foreground/50 truncate">Nenhum candidato ativo</div>
                    <div className="text-[10px] text-sidebar-foreground/40 truncate">Acesse Configurações</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
