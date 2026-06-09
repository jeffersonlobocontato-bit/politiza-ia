import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar
} from '@/components/ui/sidebar';
import {
  Crosshair, Map, Globe, ClipboardList, Smartphone,
  Users, BarChart2, Network, Settings, ShieldCheck, ShieldAlert, Vote, Activity, Calendar, Building2,
  ChevronDown, Check, UsersRound
} from 'lucide-react';
import { useCandidate, type CampaignType } from '@/contexts/CandidateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserParty } from '@/hooks/useUserParty';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

type ModuleScope = 'majoritaria' | 'proporcional' | 'shared';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  highlight?: boolean;
  scope: ModuleScope;
}

const navItems: NavItem[] = [
  // Shared (always visible)
  { title: 'Sala de Guerra', url: '/', icon: Crosshair, scope: 'shared' },
  { title: 'Mapa Estratégico', url: '/mapa', icon: Map, scope: 'shared' },
  { title: 'Ações', url: '/acoes', icon: ClipboardList, scope: 'shared' },
  { title: 'Agenda', url: '/agenda', icon: Calendar, scope: 'shared' },
  { title: 'Campo', url: '/campo', icon: Smartphone, scope: 'shared' },
  { title: 'Ativos Políticos', url: '/ativos', icon: Users, scope: 'shared' },
  { title: 'Pesquisas', url: '/pesquisas', icon: BarChart2, scope: 'shared' },
  { title: 'Chapas', url: '/chapas', icon: UsersRound, scope: 'shared' },
  // Proporcional-only
  { title: 'Proporcional', url: '/proporcional', icon: Vote, scope: 'proporcional' },
  { title: 'Tracking', url: '/tracking', icon: Activity, scope: 'shared' },
  { title: 'Sala de Crise', url: '/sala-de-crise', icon: ShieldAlert, highlight: true, scope: 'shared' },
  { title: 'Territórios', url: '/territorios', icon: Globe, scope: 'shared' },
  { title: 'Municípios', url: '/municipios', icon: Building2, scope: 'shared' },
  { title: 'Hierarquia', url: '/hierarquia', icon: Network, scope: 'shared' },
  { title: 'Configurações', url: '/configuracoes', icon: Settings, scope: 'shared' },
];

function isItemVisible(item: NavItem, campaignType: CampaignType): boolean {
  if (item.scope === 'shared') return true;
  if (!campaignType) return true; // No active candidate → show all
  return item.scope === campaignType;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { activeCandidate, campaignType, activeCandidates, allActiveCandidates, hasFullAccess, isViewingAll, selectedCandidateIds, setActive, setSelectedCandidateIds } = useCandidate();
  const { isAdmin } = useAuth();
  const { isPartyManager } = useUserParty();

  const showChapas = isAdmin || isPartyManager;
  const visibleItems = navItems
    .filter(item => isItemVisible(item, campaignType))
    .filter(item => item.url !== '/chapas' || showChapas);

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/30 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Crosshair className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-black text-sm text-white leading-tight">Gestão Eleitoral</div>
              <div className="text-[10px] text-sidebar-foreground/60 leading-none mt-0.5">
                Plataforma de Estratégia Política com IA Integrada
              </div>
            </div>
          )}
        </div>

        <SidebarGroup className="py-3">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 px-4 mb-1">
              Módulos
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.url;
                const isHighlight = item.highlight;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                          isActive
                            ? 'bg-primary/20 text-white font-semibold border-l-2 border-primary'
                            : isHighlight
                            ? 'text-white/80 hover:bg-destructive/30 hover:text-white'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                        }`}
                        activeClassName=""
                      >
                        <item.icon className={`flex-shrink-0 w-4 h-4 ${
                          isActive ? 'text-primary' : isHighlight ? 'text-destructive' : 'text-sidebar-foreground/70'
                        }`} />
                        <span>{item.title}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        {!isActive && isHighlight && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Candidate / campaign type badge + profile */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-sidebar-border/30">
            {campaignType && (
              <div className={`mb-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-center ${
                campaignType === 'majoritaria'
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-secondary/20 text-secondary border border-secondary/40'
              }`}>
                {campaignType === 'majoritaria' ? 'Campanha Majoritária' : 'Campanha Proporcional'}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 flex-shrink-0 overflow-hidden">
                {activeCandidate?.photo_url
                  ? <img src={activeCandidate.photo_url} alt={activeCandidate.name} className="w-full h-full object-cover" />
                  : <ShieldCheck className="w-4 h-4 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                {activeCandidate ? (
                  <>
                    <div className="text-xs font-semibold text-white truncate">{activeCandidate.name}</div>
                    <div className="text-[10px] text-sidebar-foreground/50 truncate">{activeCandidate.cargo} · {activeCandidate.party}</div>
                  </>
                ) : activeCandidates.length > 0 ? (
                  <>
                    <div className="text-xs font-semibold text-white truncate">
                      {isViewingAll ? 'Visão consolidada' : `${selectedCandidateIds.length} candidatos selecionados`}
                    </div>
                    <div className="text-[10px] text-sidebar-foreground/50 truncate">
                      {activeCandidates.length} {activeCandidates.length === 1 ? 'candidato ativo' : 'candidatos ativos'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-sidebar-foreground/60 truncate">Nenhum candidato ativo</div>
                    <div className="text-[10px] text-sidebar-foreground/40 truncate">Acesse Configurações</div>
                  </>
                )}
              </div>
            </div>

            {/* Seletor de candidato (filtro de visualização) */}
            {allActiveCandidates.length > 0 && (
              hasFullAccess ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-3 w-full flex items-center justify-between gap-2 text-[11px] bg-white/10 text-white border border-white/20 rounded px-2 py-1.5 hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedCandidateIds.length === 0
                          ? `Todos os candidatos (${allActiveCandidates.length})`
                          : selectedCandidateIds.length === 1
                          ? allActiveCandidates.find(c => c.id === selectedCandidateIds[0])?.name ?? '1 selecionado'
                          : `${selectedCandidateIds.length} de ${allActiveCandidates.length} selecionados`}
                      </span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-2">
                    <div className="flex items-center justify-between px-2 py-1.5 text-[11px] text-muted-foreground border-b mb-1">
                      <span>Filtrar candidatos</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCandidateIds([])}
                        className="text-primary hover:underline"
                      >
                        Ver todos
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {allActiveCandidates.map(c => {
                        const checked = selectedCandidateIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? [...selectedCandidateIds, c.id]
                                  : selectedCandidateIds.filter(id => id !== c.id);
                                setSelectedCandidateIds(next);
                              }}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{c.cargo} · {c.party}</div>
                            </div>
                            {checked && <Check className="w-3 h-3 text-primary mt-1 flex-shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <select
                  value={activeCandidate?.id ?? ''}
                  onChange={e => setActive(e.target.value || null)}
                  className="mt-3 w-full text-[11px] bg-white/10 text-white border border-white/20 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {allActiveCandidates.map(c => (
                    <option key={c.id} value={c.id} className="text-foreground bg-background">
                      {c.name} — {c.cargo}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
