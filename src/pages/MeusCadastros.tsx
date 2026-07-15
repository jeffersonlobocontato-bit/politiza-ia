import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Users, ClipboardList, UsersRound, Trash2, ExternalLink, Search, Calendar, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useCandidate } from '@/contexts/CandidateContext';
import { useMyScope, softDeleteRow, newestSince } from '@/hooks/useMyScope';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

function KpiCard({ label, value, icon: Icon, accent, hint }: { label: string; value: number | string; icon: any; accent: string; hint?: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: `${accent}22`, color: accent }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className="text-2xl font-black leading-tight">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </Card>
  );
}

function AuthorBadge({ authorId, authors }: { authorId: string | null; authors: Record<string, { name: string }> }) {
  if (!authorId) return <span className="text-xs text-muted-foreground">—</span>;
  const author = authors[authorId];
  return <Badge variant="outline" className="text-[10px]">{author?.name ?? 'Usuário'}</Badge>;
}

export default function MeusCadastros() {
  const { activeCandidate } = useCandidate();
  const scope = useMyScope(activeCandidate?.id ?? null);
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  const authorOptions = useMemo(() => Object.entries(scope.authors).map(([id, a]) => ({ id, name: a.name })), [scope.authors]);

  const filt = (text: string, authorId: string | null) => {
    const okAuthor = authorFilter === 'all' || authorId === authorFilter;
    const okText = !search || text.toLowerCase().includes(search.toLowerCase());
    return okAuthor && okText;
  };

  const filteredAssets = scope.assets.filter(a => filt(`${a.name} ${a.nickname ?? ''} ${a.municipality ?? ''}`, a.created_by));
  const filteredLeaders = scope.leaders.filter(l => filt(`${l.name} ${l.municipality ?? ''}`, l.created_by));
  const filteredActions = scope.actions.filter(a => filt(`${a.title} ${a.municipality ?? ''}`, a.created_by));
  const filteredMembers = scope.members.filter(m => filt(`${m.name} ${m.role ?? ''} ${m.municipality ?? ''}`, m.created_by));

  const handleDelete = async (table: 'political_assets' | 'leaders' | 'actions' | 'campaign_members', id: string, label: string) => {
    try {
      await softDeleteRow(table, id);
      toast.success(`${label} excluído`);
      await scope.refetchAll();
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao excluir');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <FolderKanban className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Meus Cadastros</h1>
          <p className="text-sm text-muted-foreground">
            Tudo que você e sua equipe cadastraram — visualize, edite e gerencie.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <KpiCard label="Ativos políticos" value={scope.assets.length} icon={Users} accent="#1F5AB4" hint={`${newestSince(scope.assets, 7)} novos em 7d`} />
        <KpiCard label="Lideranças" value={scope.leaders.length} icon={UsersRound} accent="#2FA85A" hint={`${newestSince(scope.leaders, 7)} novos em 7d`} />
        <KpiCard label="Ações de campo" value={scope.actions.length} icon={ClipboardList} accent="#E85D3A" hint={`${newestSince(scope.actions, 7)} novos em 7d`} />
        <KpiCard label="Membros da equipe" value={scope.members.length} icon={UsersRound} accent="#9B87F5" hint={`${scope.subtreeUserIds.length} usuários na sua rede`} />
        <KpiCard label="Novos (30d)" value={newestSince([...scope.assets, ...scope.leaders, ...scope.actions, ...scope.members], 30)} icon={Calendar} accent="#F5B342" />
      </div>

      {/* Filtros */}
      <Card className="p-3 flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, cidade, cargo…" className="pl-9" />
        </div>
        <select
          value={authorFilter}
          onChange={e => setAuthorFilter(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm min-w-[220px]"
        >
          <option value="all">Todos os autores</option>
          {authorOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Card>

      <Tabs defaultValue="assets">
        <TabsList className="grid grid-cols-4 max-w-3xl">
          <TabsTrigger value="assets">Ativos ({filteredAssets.length})</TabsTrigger>
          <TabsTrigger value="leaders">Lideranças ({filteredLeaders.length})</TabsTrigger>
          <TabsTrigger value="actions">Ações ({filteredActions.length})</TabsTrigger>
          <TabsTrigger value="members">Membros ({filteredMembers.length})</TabsTrigger>
        </TabsList>

        {/* ATIVOS */}
        <TabsContent value="assets" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Cidade</th>
                    <th className="text-left px-4 py-3">Autor</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{a.name}</div>
                        {a.nickname && <div className="text-xs italic text-muted-foreground">"{a.nickname}"</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.type ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.municipality ?? '—'}</td>
                      <td className="px-4 py-3"><AuthorBadge authorId={a.created_by} authors={scope.authors} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(a.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          onOpen={<Link to="/ativos"><Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Abrir</Button></Link>}
                          onDelete={() => handleDelete('political_assets', a.id, 'Ativo')}
                          label={a.name}
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 && <EmptyRow cols={6} label="Nenhum ativo político no seu escopo." />}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* LIDERANÇAS */}
        <TabsContent value="leaders" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Cidade</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Autor</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaders.map(l => (
                    <tr key={l.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{l.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.municipality ?? '—'}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px] uppercase">{l.status ?? '—'}</Badge></td>
                      <td className="px-4 py-3"><AuthorBadge authorId={l.created_by} authors={scope.authors} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(l.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          onOpen={<Link to={`/campo/liderancas/${l.id}`}><Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Editar</Button></Link>}
                          onDelete={() => handleDelete('leaders', l.id, 'Liderança')}
                          label={l.name}
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredLeaders.length === 0 && <EmptyRow cols={6} label="Nenhuma liderança no seu escopo." />}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* AÇÕES */}
        <TabsContent value="actions" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Título</th>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-left px-4 py-3">Cidade</th>
                    <th className="text-left px-4 py-3">Público</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Autor</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.map(a => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{a.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.category ?? a.type ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.municipality ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.executed_people_count ?? 0}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px] uppercase">{a.status ?? '—'}</Badge></td>
                      <td className="px-4 py-3"><AuthorBadge authorId={a.created_by} authors={scope.authors} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(a.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          onOpen={<Link to="/acoes"><Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Abrir</Button></Link>}
                          onDelete={() => handleDelete('actions', a.id, 'Ação')}
                          label={a.title}
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredActions.length === 0 && <EmptyRow cols={8} label="Nenhuma ação registrada no seu escopo." />}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* MEMBROS */}
        <TabsContent value="members" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Função</th>
                    <th className="text-left px-4 py-3">Cidade</th>
                    <th className="text-left px-4 py-3">Autor do cadastro</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.role ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{m.municipality ?? '—'}</td>
                      <td className="px-4 py-3"><AuthorBadge authorId={m.created_by} authors={scope.authors} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          onOpen={<Link to="/configuracoes"><Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Gerenciar</Button></Link>}
                          onDelete={() => handleDelete('campaign_members', m.id, 'Membro')}
                          label={m.name}
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && <EmptyRow cols={6} label="Nenhum membro cadastrado por você ou sua equipe." />}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-muted-foreground">{label}</td></tr>
  );
}

function RowActions({ onOpen, onDelete, label }: { onOpen: React.ReactNode; onDelete: () => void; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      {onOpen}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {label}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação pode ser revertida por um administrador.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
