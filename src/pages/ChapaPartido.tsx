import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Instagram, MessageCircle, Pencil, Plus, Trash2, Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserParty } from '@/hooks/useUserParty';
import {
  usePartySlate, useUpsertSlateCandidate, useDeleteSlateCandidate,
  type SlateParty, type SlateCargo, type SlateCandidate, type SlateFiliacaoStatus,
} from '@/hooks/usePartySlate';

const CARGOS: SlateCargo[] = ['Deputado Federal', 'Deputado Estadual'];

const FIL_LABEL: Record<SlateFiliacaoStatus, string> = {
  ok: 'OK',
  pl: 'PL',
  pl_mulher: 'PL Mulher',
  deputado_atual: 'Deputado(a) atual',
  pendente: 'Pendente',
  outro: 'Outro',
};
const FIL_STYLE: Record<SlateFiliacaoStatus, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pl: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  pl_mulher: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  deputado_atual: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  pendente: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  outro: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : Math.round(n).toLocaleString('pt-BR');

const initialDraft = (party: SlateParty, cargo: SlateCargo): Partial<SlateCandidate> => ({
  party, cargo,
  name: '',
  filiacao_status: 'pendente',
  is_active: true,
});

export default function ChapaPartido() {
  const { party: partyParam } = useParams<{ party: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { party: userParty, isPartyManager } = useUserParty();

  const party = (partyParam === 'PL' || partyParam === 'Novo') ? (partyParam as SlateParty) : null;
  const canAccess = party && (isAdmin || (isPartyManager && userParty === party));

  const { data: rows = [], isLoading } = usePartySlate(canAccess ? party : null);
  const upsert = useUpsertSlateCandidate();
  const del = useDeleteSlateCandidate();

  const [tab, setTab] = useState<SlateCargo>('Deputado Federal');
  const [search, setSearch] = useState('');
  const [filterAssoc, setFilterAssoc] = useState<string>('all');
  const [filterFiliacao, setFilterFiliacao] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');

  const [editing, setEditing] = useState<Partial<SlateCandidate> | null>(null);

  const cargoRows = useMemo(() => rows.filter(r => r.cargo === tab), [rows, tab]);

  const associations = useMemo(
    () => Array.from(new Set(cargoRows.map(r => r.association).filter(Boolean))).sort() as string[],
    [cargoRows],
  );
  const cities = useMemo(
    () => Array.from(new Set(cargoRows.map(r => r.city).filter(Boolean))).sort() as string[],
    [cargoRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cargoRows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.city ?? '').toLowerCase().includes(q)) return false;
      if (filterAssoc !== 'all' && r.association !== filterAssoc) return false;
      if (filterFiliacao !== 'all' && r.filiacao_status !== filterFiliacao) return false;
      if (filterCity !== 'all' && r.city !== filterCity) return false;
      return true;
    });
  }, [cargoRows, search, filterAssoc, filterFiliacao, filterCity]);

  const kpis = useMemo(() => {
    const total = cargoRows.length;
    const ok = cargoRows.filter(r => r.filiacao_status === 'ok' || r.filiacao_status === 'deputado_atual').length;
    const sumBom = cargoRows.reduce((s, r) => s + (r.votes_bom ?? 0), 0);
    const sumMedio = cargoRows.reduce((s, r) => s + (r.votes_medio ?? 0), 0);
    const sumRuim = cargoRows.reduce((s, r) => s + (r.votes_ruim ?? 0), 0);
    return {
      total,
      okPct: total ? Math.round((ok / total) * 100) : 0,
      sumBom, sumMedio, sumRuim,
    };
  }, [cargoRows]);

  if (!party) {
    return <div className="p-8">Partido inválido.</div>;
  }
  if (!canAccess) {
    return <div className="p-8">Você não tem acesso à chapa do {party}.</div>;
  }

  const handleSave = async () => {
    if (!editing?.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const order = editing.order_index ?? (cargoRows.reduce((m, r) => Math.max(m, r.order_index), 0) + 1);
    try {
      await upsert.mutateAsync({
        ...editing,
        party,
        cargo: editing.cargo ?? tab,
        name: editing.name.trim(),
        order_index: order,
      } as any);
      toast.success(editing.id ? 'Candidato atualizado' : 'Candidato adicionado');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este candidato da chapa?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Candidato removido');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover');
    }
  };

  const onlyDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/chapas')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-xl md:text-2xl font-black tracking-tight">Chapa {party} — Paraná</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SlateCargo)}>
        <TabsList>
          {CARGOS.map(c => (
            <TabsTrigger key={c} value={c}>
              {c}{' '}
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({rows.filter(r => r.cargo === c).length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CARGOS.map(c => (
          <TabsContent key={c} value={c} className="mt-4 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Total na chapa" value={kpis.total} />
              <Kpi label="% Filiação OK" value={`${kpis.okPct}%`} />
              <Kpi label="Projeção (Bom)" value={fmt(kpis.sumBom)} accent="emerald" />
              <Kpi label="Projeção (Médio)" value={fmt(kpis.sumMedio)} accent="amber" />
              <Kpi label="Projeção (Ruim)" value={fmt(kpis.sumRuim)} accent="rose" />
            </div>

            {/* Filtros */}
            <Card className="p-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou cidade…"
                  className="pl-7"
                />
              </div>
              <Select value={filterAssoc} onValueChange={setFilterAssoc}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Associação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as associações</SelectItem>
                  {associations.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterFiliacao} onValueChange={setFilterFiliacao}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Filiação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(FIL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setEditing(initialDraft(party, tab))}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </Card>

            {/* Tabela */}
            <Card className="overflow-hidden">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Associação</TableHead>
                      <TableHead>Filiação</TableHead>
                      <TableHead className="text-right">Bom</TableHead>
                      <TableHead className="text-right">Médio</TableHead>
                      <TableHead className="text-right">Ruim</TableHead>
                      <TableHead className="w-[140px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Nenhum candidato encontrado.</TableCell></TableRow>
                    )}
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground font-mono">{r.order_index}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                              {r.photo_url
                                ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-bold">{r.name.slice(0, 2).toUpperCase()}</div>}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{r.name}</div>
                              {r.filiacao_note && <div className="text-[10px] text-muted-foreground truncate">{r.filiacao_note}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.city ?? '—'}</TableCell>
                        <TableCell>
                          {r.association
                            ? <Badge variant="outline" className="text-[10px]">{r.association}</Badge>
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] border ${FIL_STYLE[r.filiacao_status]}`}>
                            {FIL_LABEL[r.filiacao_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.votes_bom)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.votes_medio)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.votes_ruim)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.phone && (
                              <a
                                href={`https://wa.me/55${onlyDigits(r.phone)}`}
                                target="_blank" rel="noreferrer"
                                title="WhatsApp"
                                className="p-1.5 rounded hover:bg-accent"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </a>
                            )}
                            {r.instagram_url && (
                              <a
                                href={r.instagram_url}
                                target="_blank" rel="noreferrer"
                                title="Instagram"
                                className="p-1.5 rounded hover:bg-accent"
                              >
                                <Instagram className="w-3.5 h-3.5 text-fuchsia-500" />
                              </a>
                            )}
                            <button
                              title="Editar"
                              className="p-1.5 rounded hover:bg-accent"
                              onClick={() => setEditing(r)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Remover"
                              className="p-1.5 rounded hover:bg-destructive/10"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Drawer de edição */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? 'Editar candidato' : 'Adicionar candidato'}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="mt-4 space-y-3">
              <Field label="Nome*">
                <Input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cargo">
                  <Select
                    value={editing.cargo ?? tab}
                    onValueChange={(v) => setEditing({ ...editing, cargo: v as SlateCargo })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Ordem">
                  <Input
                    type="number"
                    value={editing.order_index ?? ''}
                    onChange={e => setEditing({ ...editing, order_index: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cidade">
                  <Input value={editing.city ?? ''} onChange={e => setEditing({ ...editing, city: e.target.value })} />
                </Field>
                <Field label="Associação">
                  <Input value={editing.association ?? ''} onChange={e => setEditing({ ...editing, association: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Status filiação">
                  <Select
                    value={editing.filiacao_status ?? 'pendente'}
                    onValueChange={(v) => setEditing({ ...editing, filiacao_status: v as SlateFiliacaoStatus })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Observação filiação">
                  <Input value={editing.filiacao_note ?? ''} onChange={e => setEditing({ ...editing, filiacao_note: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Telefone">
                  <Input value={editing.phone ?? ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
                </Field>
                <Field label="Instagram (URL)">
                  <Input value={editing.instagram_url ?? ''} onChange={e => setEditing({ ...editing, instagram_url: e.target.value })} />
                </Field>
              </div>
              <Field label="Foto (URL)">
                <Input value={editing.photo_url ?? ''} onChange={e => setEditing({ ...editing, photo_url: e.target.value })} />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Votos (Bom)">
                  <Input type="number" value={editing.votes_bom ?? ''} onChange={e => setEditing({ ...editing, votes_bom: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <Field label="Votos (Médio)">
                  <Input type="number" value={editing.votes_medio ?? ''} onChange={e => setEditing({ ...editing, votes_medio: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <Field label="Votos (Ruim)">
                  <Input type="number" value={editing.votes_ruim ?? ''} onChange={e => setEditing({ ...editing, votes_ruim: e.target.value ? Number(e.target.value) : null })} />
                </Field>
              </div>
              <Field label="Observações">
                <Textarea rows={3} value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={upsert.isPending}>
                  {upsert.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: 'emerald' | 'amber' | 'rose' }) {
  const ring = accent === 'emerald' ? 'border-emerald-500/30' : accent === 'amber' ? 'border-amber-500/30' : accent === 'rose' ? 'border-rose-500/30' : 'border-border';
  return (
    <Card className={`p-3 border ${ring}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </Card>
  );
}
