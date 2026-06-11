import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLeaders, Leader } from '@/hooks/useLeaders';
import { useVoteProjections, VoteProjection } from '@/hooks/useVoteProjections';
import { useLeadershipProfiles } from '@/hooks/useLeadershipProfiles';
import { LeaderFormDialog } from '@/components/proporcional/LeaderFormDialog';
import { ProjectionFormDialog } from '@/components/proporcional/ProjectionFormDialog';
import { useCandidate } from '@/contexts/CandidateContext';
import { supabase } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUserParty } from '@/hooks/useUserParty';
import type { SlateParty, SlateCandidate } from '@/hooks/usePartySlate';
import ChapaConsolidatedView from '@/components/proporcional/ChapaConsolidatedView';
import PreCandidateDetailView from '@/components/proporcional/PreCandidateDetailView';
import {
  Plus, Search, Users, TrendingUp, BarChart3, ChevronRight,
  Vote, Filter, UsersRound, ShieldAlert, UserCheck,
} from 'lucide-react';

const MACROREGION_NAMES: Record<string, string> = {
  curitiba: 'Curitiba', rmc: 'RMC', litoral: 'Litoral', campos_gerais: 'Campos Gerais',
  norte: 'Norte', noroeste: 'Noroeste', oeste: 'Oeste',
  sudoeste: 'Sudoeste', centro_sul: 'Centro-Sul', sudeste: 'Sudeste',
};

const CANDIDACY_LABELS: Record<string, string> = {
  vereador: 'Vereador', deputado_estadual: 'Dep. Estadual',
  deputado_federal: 'Dep. Federal', senador: 'Senador',
};

export default function Proporcional() {
  const [tab, setTab] = useState('chapa');
  const [leaderSearch, setLeaderSearch] = useState('');
  const [projSearch, setProjSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState('all');
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [projDialogOpen, setProjDialogOpen] = useState(false);
  const [editLeader, setEditLeader] = useState<Leader | undefined>();
  const [editProjection, setEditProjection] = useState<VoteProjection | undefined>();
  const [selectedPreCand, setSelectedPreCand] = useState<SlateCandidate | null>(null);

  const { activeCandidate } = useCandidate();
  const { isAdmin } = useAuth();
  const { party: userParty, isPartyManager } = useUserParty();

  const { data: allLeaders = [], isLoading: loadingLeaders } = useLeaders();
  const { data: projections = [], isLoading: loadingProj } = useVoteProjections(
    activeCandidate ? { candidate_id: activeCandidate.id } : undefined,
  );
  const { data: profiles = [] } = useLeadershipProfiles();

  // Escopo de partidos (admin vê os 2, gestor vê só o seu)
  const allowedParties: SlateParty[] = isAdmin
    ? ['PL', 'Novo']
    : isPartyManager && userParty
      ? [userParty]
      : ['PL', 'Novo']; // fallback amplo (RLS no banco já bloqueia o que não pode ver)

  // Filter leaders linked to active candidate
  const leaders = useMemo(() => {
    if (!activeCandidate) return allLeaders;
    return allLeaders.filter((l) => l.candidate_id === activeCandidate.id);
  }, [allLeaders, activeCandidate]);

  // Leader profiles junction
  const { data: leaderProfileLinks = [] } = useQuery({
    queryKey: ['leader-profile-links-all'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('leader_leadership_profiles').select('*');
      return data ?? [];
    },
  });

  const leaderProfileMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    leaderProfileLinks.forEach((l: any) => {
      if (!map[l.leader_id]) map[l.leader_id] = [];
      map[l.leader_id].push(l.profile_id);
    });
    return map;
  }, [leaderProfileLinks]);

  const candidateMap = useMemo(() => {
    const m: Record<string, any> = {};
    if (activeCandidate) m[activeCandidate.id] = activeCandidate;
    return m;
  }, [activeCandidate]);

  const leaderMap = useMemo(() => {
    const m: Record<string, Leader> = {};
    leaders.forEach((l) => { m[l.id] = l; });
    return m;
  }, [leaders]);

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach((p) => { m[p.id] = p; });
    return m;
  }, [profiles]);

  const filteredLeaders = useMemo(() => {
    return leaders.filter((l) => {
      if (leaderSearch && !l.name.toLowerCase().includes(leaderSearch.toLowerCase())) return false;
      if (macroFilter !== 'all' && l.macroregion_id !== macroFilter) return false;
      return true;
    });
  }, [leaders, leaderSearch, macroFilter]);

  const filteredProjections = useMemo(() => {
    return projections.filter((p) => {
      if (projSearch) {
        const leader = leaderMap[p.leader_id];
        const candidate = candidateMap[p.candidate_id];
        const searchLower = projSearch.toLowerCase();
        if (!leader?.name.toLowerCase().includes(searchLower) &&
            !candidate?.name.toLowerCase().includes(searchLower) &&
            !p.municipality?.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [projections, projSearch, leaderMap, candidateMap]);

  const openEditLeader = (l: Leader) => { setEditLeader(l); setLeaderDialogOpen(true); };
  const openNewLeader = () => { setEditLeader(undefined); setLeaderDialogOpen(true); };
  const openEditProjection = (p: VoteProjection) => { setEditProjection(p); setProjDialogOpen(true); };
  const openNewProjection = () => { setEditProjection(undefined); setProjDialogOpen(true); };

  const handleOpenPreCand = (s: SlateCandidate) => {
    setSelectedPreCand(s);
    setTab('precand');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            Campanha Proporcional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chapa partidária, pré-candidatos, lideranças e projeção de votos
          </p>
        </div>
        {activeCandidate && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {activeCandidate.photo_url
                ? <img src={activeCandidate.photo_url} alt={activeCandidate.name} className="w-full h-full object-cover" />
                : <span className="text-sm font-bold text-primary">{activeCandidate.name.charAt(0)}</span>}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{activeCandidate.name}</p>
              <p className="text-xs text-muted-foreground">{activeCandidate.cargo} · {activeCandidate.party}</p>
            </div>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="chapa" className="gap-1.5"><UsersRound className="w-3.5 h-3.5" />Visão de Chapa</TabsTrigger>
          <TabsTrigger value="precand" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" />Pré-candidato</TabsTrigger>
          <TabsTrigger value="liderancas" className="gap-1.5"><Users className="w-3.5 h-3.5" />Lideranças</TabsTrigger>
          <TabsTrigger value="projecoes" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Projeções</TabsTrigger>
        </TabsList>

        {/* ======================== VISÃO DE CHAPA ======================== */}
        <TabsContent value="chapa" className="space-y-6 mt-4">
          {!isAdmin && !isPartyManager ? (
            <Card className="p-6 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <div className="font-semibold">Acesso restrito</div>
                <p className="text-sm text-muted-foreground mt-1">
                  A visão consolidada de chapa é restrita a administradores da plataforma e gestores estaduais de partido.
                </p>
              </div>
            </Card>
          ) : (
            <ChapaConsolidatedView parties={allowedParties} onOpenPreCandidate={handleOpenPreCand} />
          )}
        </TabsContent>

        {/* ======================== PRÉ-CANDIDATO ======================== */}
        <TabsContent value="precand" className="space-y-4 mt-4">
          {selectedPreCand ? (
            <PreCandidateDetailView
              slate={selectedPreCand}
              onBack={() => { setSelectedPreCand(null); setTab('chapa'); }}
            />
          ) : (
            <Card className="p-8 text-center">
              <UserCheck className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Selecione um pré-candidato na <strong className="text-foreground">Visão de Chapa</strong> para ver o
                drill-down com projeções sustentadas, lideranças, perfis e ações.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab('chapa')}>
                Ir para Visão de Chapa
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* ======================== LIDERANÇAS ======================== */}
        <TabsContent value="liderancas" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar liderança..." value={leaderSearch} onChange={(e) => setLeaderSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={macroFilter} onValueChange={setMacroFilter}>
                <SelectTrigger className="w-44"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas regiões</SelectItem>
                  {Object.entries(MACROREGION_NAMES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openNewLeader}><Plus className="w-4 h-4 mr-1" /> Nova Liderança</Button>
          </div>

          <Card className="bg-card/80 border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Nome</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>Macrorregião</TableHead>
                    <TableHead>Perfis</TableHead>
                    <TableHead>Influência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Partido</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLeaders ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filteredLeaders.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma liderança encontrada</TableCell></TableRow>
                  ) : filteredLeaders.map((l) => (
                    <TableRow key={l.id} className="border-border/30 cursor-pointer hover:bg-muted/30" onClick={() => openEditLeader(l)}>
                      <TableCell className="font-medium text-foreground">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{l.municipality || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{MACROREGION_NAMES[l.macroregion_id || ''] || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(leaderProfileMap[l.id] || []).slice(0, 3).map((pid) => {
                            const p = profileMap[pid];
                            return p ? (
                              <Badge key={pid} variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: p.color, color: p.color }}>{p.name}</Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${l.influence_level * 10}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{l.influence_level}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'ativo' ? 'default' : 'secondary'} className="text-[10px]">{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.current_party || '—'}</TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================== PROJEÇÕES ======================== */}
        <TabsContent value="projecoes" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por liderança, candidato ou cidade..." value={projSearch} onChange={(e) => setProjSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={openNewProjection}><Plus className="w-4 h-4 mr-1" /> Nova Projeção</Button>
          </div>

          <Card className="bg-card/80 border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Liderança</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead className="text-center text-green-400">Bom</TableHead>
                    <TableHead className="text-center text-amber-400">Médio</TableHead>
                    <TableHead className="text-center text-red-400">Ruim</TableHead>
                    <TableHead>Conf.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingProj ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filteredProjections.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma projeção encontrada</TableCell></TableRow>
                  ) : filteredProjections.map((p) => (
                    <TableRow key={p.id} className="border-border/30 cursor-pointer hover:bg-muted/30" onClick={() => openEditProjection(p)}>
                      <TableCell className="font-medium text-foreground text-sm">{leaderMap[p.leader_id]?.name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{candidateMap[p.candidate_id]?.name || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{CANDIDACY_LABELS[p.candidacy_type] || p.candidacy_type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.municipality || '—'}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-green-400">{p.optimistic.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-amber-400">{p.intermediate.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-red-400">{p.pessimistic.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          p.reliability_index === 'alta' ? 'border-green-500 text-green-400' :
                          p.reliability_index === 'baixa' ? 'border-red-500 text-red-400' :
                          'border-amber-500 text-amber-400'
                        }`}>
                          {p.reliability_index || 'média'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'ativa' ? 'default' : 'secondary'} className="text-[10px]">{p.status}</Badge>
                      </TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeaderFormDialog
        open={leaderDialogOpen}
        onOpenChange={setLeaderDialogOpen}
        leader={editLeader}
        initialProfileIds={editLeader ? (leaderProfileMap[editLeader.id] || []) : []}
      />
      <ProjectionFormDialog
        open={projDialogOpen}
        onOpenChange={setProjDialogOpen}
        projection={editProjection}
      />
    </div>
  );
}
