import { useMemo, useState } from 'react';
import { Printer, Search, Truck, CheckCircle2, CalendarClock, MapPinned, Package, X, Trash2, Pencil, FileBarChart, Camera, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LogisticaEnvio, LogisticaResponsavel } from '@/hooks/useLogisticaMaterial';
import { buildRotaMapaSvg } from '@/lib/rotaMapaSvg';
import { useDeleteEntregaGrupo, useUpdateEnvioQuantidade, useAddItensEntrega, useItensCampanha, useConfirmarEntrega, useFotoEntregaUrl } from '@/hooks/useLogisticaMaterial';

const ROTA_LABEL: Record<string, string> = {
  '1': 'Rota 1 — azul',
  '2': 'Rota 2 — branca',
  '3': 'Rota 3 — amarela',
};

export interface EntregaAgrupada {
  grupoId: string;
  municipio: string;
  macroregionId: string | null;
  data: string;
  rota: number | null;
  ordemRota: number | null;
  responsavelId: string | null;
  observacoes: string | null;
  criadaEm: string;
  entregue: boolean;
  fotoPath: string | null;
  entregaObs: string | null;
  entregueEm: string | null;
  itens: LogisticaEnvio[];
  total: number;
}

function agrupar(envios: LogisticaEnvio[]): EntregaAgrupada[] {
  const porGrupo = new Map<string, LogisticaEnvio[]>();
  for (const e of envios) {
    if (e.tipo_movimentacao === 'retirada') continue;
    const list = porGrupo.get(e.grupo_entrega_id) ?? [];
    list.push(e);
    porGrupo.set(e.grupo_entrega_id, list);
  }
  return Array.from(porGrupo.entries()).map(([grupoId, itens]) => ({
    grupoId,
    municipio: itens[0].municipio,
    macroregionId: itens[0].macroregion_id,
    data: itens[0].data_envio,
    rota: itens[0].rota,
    ordemRota: itens[0].ordem_rota,
    responsavelId: itens[0].responsavel_id,
    observacoes: itens[0].observacoes,
    criadaEm: itens.reduce((min, i) => (i.created_at < min ? i.created_at : min), itens[0].created_at),
    entregue: itens.some(i => i.entregue),
    fotoPath: itens.find(i => i.foto_url)?.foto_url ?? null,
    entregaObs: itens.find(i => i.entrega_obs)?.entrega_obs ?? null,
    entregueEm: itens.find(i => i.entregue_em)?.entregue_em ?? null,
    itens,
    total: itens.reduce((s, i) => s + i.quantidade, 0),
  }));
}

export default function ListaEntregasTab({
  envios, macroRegions, responsaveis,
}: {
  envios: LogisticaEnvio[];
  macroRegions: { id: string; name: string }[];
  responsaveis: LogisticaResponsavel[];
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const [busca, setBusca] = useState('');
  const [filtroRota, setFiltroRota] = useState<string>('todas');
  const [filtroRegiao, setFiltroRegiao] = useState<string>('todas');
  const [showPrint, setShowPrint] = useState(false);
  const [showRelCwb, setShowRelCwb] = useState(false);
  const [detalhe, setDetalhe] = useState<'feitas' | 'previstas' | 'itens-feitas' | 'itens-previstas' | null>(null);

  const grupos = useMemo(() => agrupar(envios), [envios]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return grupos.filter(g => {
      if (filtroRota !== 'todas') {
        if (filtroRota === 'sem' ? g.rota !== null : String(g.rota) !== filtroRota) return false;
      }
      if (filtroRegiao !== 'todas' && g.macroregionId !== filtroRegiao) return false;
      if (q) {
        const resp = responsaveis.find(r => r.id === g.responsavelId)?.nome ?? '';
        if (!g.municipio.toLowerCase().includes(q) && !resp.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [grupos, busca, filtroRota, filtroRegiao, responsaveis]);

  const feitas = useMemo(
    () => filtrados.filter(g => g.data <= hoje).sort((a, b) => b.data.localeCompare(a.data)),
    [filtrados, hoje]
  );
  const previstas = useMemo(
    () => filtrados.filter(g => g.data > hoje).sort((a, b) => a.data.localeCompare(b.data)),
    [filtrados, hoje]
  );


  const deleteGrupo = useDeleteEntregaGrupo();
  const [confirmar, setConfirmar] = useState<EntregaAgrupada | null>(null);
  const [editando, setEditando] = useState<EntregaAgrupada | null>(null);
  const [lancando, setLancando] = useState<EntregaAgrupada | null>(null);
  const [vendoFoto, setVendoFoto] = useState<EntregaAgrupada | null>(null);

  const regiaoNome = (id: string | null) => macroRegions.find(r => r.id === id)?.name ?? '—';
  const respNome = (id: string | null) => responsaveis.find(r => r.id === id)?.nome ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini label="Entregas realizadas" value={String(feitas.length)} icon={CheckCircle2} onClick={() => setDetalhe('feitas')} />
        <Mini label="Entregas previstas" value={String(previstas.length)} icon={CalendarClock} onClick={() => setDetalhe('previstas')} />
        <Mini
          label="Itens entregues"
          value={feitas.reduce((s, g) => s + g.total, 0).toLocaleString('pt-BR')}
          icon={Package}
          onClick={() => setDetalhe('itens-feitas')}
        />
        <Mini
          label="Itens previstos"
          value={previstas.reduce((s, g) => s + g.total, 0).toLocaleString('pt-BR')}
          icon={Truck}
          onClick={() => setDetalhe('itens-previstas')}
        />
      </div>

      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-3 flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> Lista de entregas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowRelCwb(true)} className="gap-1.5">
              <FileBarChart className="w-3.5 h-3.5" /> Relatório Curitiba
            </Button>
            <Button size="sm" onClick={() => setShowPrint(true)} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Imprimir rotas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Label className="text-xs text-muted-foreground">Buscar município ou responsável</Label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite para filtrar…" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rota</Label>
              <Select value={filtroRota} onValueChange={setFiltroRota}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as rotas</SelectItem>
                  <SelectItem value="1">Rota 1 — azul</SelectItem>
                  <SelectItem value="2">Rota 2 — branca</SelectItem>
                  <SelectItem value="3">Rota 3 — amarela</SelectItem>
                  <SelectItem value="sem">Sem rota definida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Região</Label>
              <Select value={filtroRegiao} onValueChange={setFiltroRegiao}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as regiões</SelectItem>
                  {macroRegions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="feitas">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="feitas" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Feitas ({feitas.length})
              </TabsTrigger>
              <TabsTrigger value="previstas" className="gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Previstas ({previstas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feitas" className="mt-3">
              <Lista grupos={feitas} regiaoNome={regiaoNome} respNome={respNome} onDelete={setConfirmar} onEdit={setEditando} onLancar={setLancando} onVerFoto={setVendoFoto} vazio="Nenhuma entrega realizada com os filtros atuais." />
            </TabsContent>
            <TabsContent value="previstas" className="mt-3">
              <Lista grupos={previstas} regiaoNome={regiaoNome} respNome={respNome} onDelete={setConfirmar} onEdit={setEditando} onLancar={setLancando} onVerFoto={setVendoFoto} vazio="Nenhuma entrega prevista com os filtros atuais." />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ImprimirRotasDialog
        open={showPrint}
        onOpenChange={setShowPrint}
        grupos={grupos}
        regiaoNome={regiaoNome}
        respNome={respNome}
      />

      <RelatorioCuritibaDialog
        open={showRelCwb}
        onOpenChange={setShowRelCwb}
        grupos={grupos}
        respNome={respNome}
        hoje={hoje}
      />

      <Dialog open={confirmar !== null} onOpenChange={() => setConfirmar(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remover cidade da rota</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir a entrega de <strong className="text-foreground">{confirmar?.municipio}</strong>
            {confirmar?.rota ? ` na ${ROTA_LABEL[String(confirmar.rota)] ?? `Rota ${confirmar.rota}`}` : ''}?
            Os {confirmar?.total.toLocaleString('pt-BR')} itens registrados deixam de contar na cobertura.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button
              variant="destructive" size="sm" disabled={deleteGrupo.isPending}
              onClick={async () => { if (confirmar) { await deleteGrupo.mutateAsync(confirmar.grupoId); setConfirmar(null); } }}
            >
              {deleteGrupo.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditarEntregaDialog grupo={editando} onClose={() => setEditando(null)} />

      <LancarEntregaDialog grupo={lancando} onClose={() => setLancando(null)} />

      <VerFotoDialog grupo={vendoFoto} onClose={() => setVendoFoto(null)} />



      <DetalheDialog
        open={detalhe !== null}
        onOpenChange={() => setDetalhe(null)}
        tipo={detalhe}
        feitas={feitas}
        previstas={previstas}
        regiaoNome={regiaoNome}
        respNome={respNome}
      />
    </div>
  );
}

function Mini({ label, value, icon: Icon, onClick }: { label: string; value: string; icon: any; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={`bg-card/80 border-border/50 transition-colors ${onClick ? 'cursor-pointer hover:border-primary/60 hover:bg-primary/5' : ''}`}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Lista({
  grupos, regiaoNome, respNome, vazio, onDelete, onEdit, onLancar, onVerFoto,
}: {
  grupos: EntregaAgrupada[];
  regiaoNome: (id: string | null) => string;
  respNome: (id: string | null) => string | null;
  vazio: string;
  onDelete?: (g: EntregaAgrupada) => void;
  onEdit?: (g: EntregaAgrupada) => void;
  onLancar?: (g: EntregaAgrupada) => void;
  onVerFoto?: (g: EntregaAgrupada) => void;
}) {
  if (grupos.length === 0) {
    return <p className="text-xs text-muted-foreground italic">{vazio}</p>;
  }
  return (
    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
      {grupos.map(g => (
        <div key={g.grupoId} className="rounded-md border border-border/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <MapPinned className="w-3.5 h-3.5 text-primary" /> {g.municipio}
              <Badge variant="outline" className="text-[10px] font-normal">{regiaoNome(g.macroregionId)}</Badge>
              {g.rota && (
                <Badge variant="secondary" className="text-[10px]">
                  {ROTA_LABEL[String(g.rota)] ?? `Rota ${g.rota}`}{g.ordemRota ? ` · ${g.ordemRota}ª parada` : ''}
                </Badge>
              )}
            </p>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              {new Date(g.data + 'T12:00:00').toLocaleDateString('pt-BR')} · {g.total.toLocaleString('pt-BR')} itens
              {onEdit && (
                <button
                  type="button"
                  aria-label={`Editar quantidades de ${g.municipio}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => onEdit(g)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label={`Remover ${g.municipio} da rota`}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => onDelete(g)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {g.itens.map(i => (
              <Badge key={i.id} variant="outline" className="text-[10px]">
                {i.tipo_material}: {i.quantidade.toLocaleString('pt-BR')}
              </Badge>
            ))}
          </div>
          {respNome(g.responsavelId) && (
            <p className="text-[11px] text-muted-foreground">Responsável: {respNome(g.responsavelId)}</p>
          )}
          {g.observacoes && <p className="text-[11px] text-muted-foreground italic">{g.observacoes}</p>}
          {g.entregue && (
            <p className="text-[11px] text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Entrega lançada{g.entregueEm ? ` em ${new Date(g.entregueEm).toLocaleString('pt-BR')}` : ''}
              {g.entregaObs ? ` · ${g.entregaObs}` : ''}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {onLancar && !g.entregue && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => onLancar(g)}>
                <Camera className="w-3.5 h-3.5" /> Lançar entrega
              </Button>
            )}
            {onLancar && g.entregue && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onLancar(g)}>
                <Camera className="w-3.5 h-3.5" /> Atualizar foto
              </Button>
            )}
            {onVerFoto && g.fotoPath && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onVerFoto(g)}>
                <ImageIcon className="w-3.5 h-3.5" /> Ver foto do kit
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditarEntregaDialog({ grupo, onClose }: { grupo: EntregaAgrupada | null; onClose: () => void }) {
  const update = useUpdateEnvioQuantidade();
  const addItens = useAddItensEntrega();
  const { data: itensCampanha = [] } = useItensCampanha();
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [novoMaterial, setNovoMaterial] = useState('');
  const [novoOutro, setNovoOutro] = useState('');
  const [novaQtd, setNovaQtd] = useState<number>(0);

  // Inicializa quantidades ao abrir um novo grupo
  const grupoId = grupo?.grupoId ?? null;
  const [carregadoPara, setCarregadoPara] = useState<string | null>(null);
  if (grupo && grupoId !== carregadoPara) {
    const init: Record<string, number> = {};
    grupo.itens.forEach(i => { init[i.id] = i.quantidade; });
    setQuantidades(init);
    setCarregadoPara(grupoId);
    setNovoMaterial(''); setNovoOutro(''); setNovaQtd(0);
  }
  if (!grupo && carregadoPara !== null) setCarregadoPara(null);

  const materialFinal = novoMaterial === '__outro' ? novoOutro.trim() : novoMaterial;

  const adicionar = async () => {
    if (!grupo || !materialFinal || novaQtd <= 0) return;
    await addItens.mutateAsync({ base: grupo.itens[0], itens: [{ tipo_material: materialFinal, quantidade: novaQtd }] });
    setNovoMaterial(''); setNovoOutro(''); setNovaQtd(0);
    onClose();
  };

  const salvar = async () => {
    if (!grupo) return;
    const updates = grupo.itens
      .filter(i => (quantidades[i.id] ?? i.quantidade) !== i.quantidade)
      .map(i => ({ id: i.id, quantidade: quantidades[i.id] ?? i.quantidade }));
    const novos = materialFinal && novaQtd > 0
      ? [{ tipo_material: materialFinal, quantidade: novaQtd }]
      : [];
    if (updates.length === 0 && novos.length === 0) { onClose(); return; }
    if (updates.length > 0) await update.mutateAsync(updates);
    if (novos.length > 0) await addItens.mutateAsync({ base: grupo.itens[0], itens: novos });
    onClose();
  };

  const salvando = update.isPending || addItens.isPending;

  return (
    <Dialog open={grupo !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" /> Editar entrega — {grupo?.municipio}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Ajuste a quantidade de cada material. Use <strong>0</strong> para remover um item da entrega.
        </p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {grupo?.itens.map(i => (
            <div key={i.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{i.tipo_material}</p>
                {i.observacoes && <p className="text-[11px] text-muted-foreground truncate italic">{i.observacoes}</p>}
              </div>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={quantidades[i.id] ?? i.quantidade}
                onChange={e => setQuantidades(prev => ({ ...prev, [i.id]: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </div>
          ))}

          <div className="rounded-md border border-dashed border-border/60 p-3 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" /> Adicionar novo item
            </p>
            <div className="flex items-center gap-2">
              <Select value={novoMaterial} onValueChange={setNovoMaterial}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {itensCampanha.map(it => (
                    <SelectItem key={it.id} value={it.nome}>{it.nome}</SelectItem>
                  ))}
                  <SelectItem value="__outro">Outro (digitar)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                className="w-28"
                placeholder="Qtd."
                value={novaQtd || ''}
                onChange={e => setNovaQtd(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            {novoMaterial === '__outro' && (
              <Input
                placeholder="Nome do material"
                value={novoOutro}
                onChange={e => setNovoOutro(e.target.value)}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!materialFinal || novaQtd <= 0 || salvando}
              onClick={adicionar}
            >
              Adicionar item
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ImprimirRotasDialog({
  open, onOpenChange, grupos, regiaoNome, respNome,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  grupos: EntregaAgrupada[];
  regiaoNome: (id: string | null) => string;
  respNome: (id: string | null) => string | null;
}) {
  const hoje = new Date().toISOString().split('T')[0];
  const chaveRota = (rota: string, criacao: string) => `${rota}|${criacao.slice(0, 10)}`;

  // Rotas distinguíveis por número + data de criação (mesma rota pode ter remessas em datas diferentes)
  const rotasDisponiveis = useMemo(() => {
    const porRota = new Map<string, EntregaAgrupada[]>();
    grupos.forEach(g => {
      const r = g.rota ? String(g.rota) : 'sem';
      porRota.set(r, [...(porRota.get(r) ?? []), g]);
    });
    const insts: { key: string; rota: string; criacao: string; total: number }[] = [];
    for (const [rota, lista] of porRota) {
      // agrupa por data de criação de cada entrega da rota
      const porData = new Map<string, number>();
      lista.forEach(g => {
        const d = g.criadaEm.slice(0, 10);
        porData.set(d, (porData.get(d) ?? 0) + 1);
      });
      Array.from(porData.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([data, total]) => insts.push({ key: chaveRota(rota, data), rota, criacao: data, total }));
    }
    return insts.sort((a, b) => a.rota.localeCompare(b.rota) || b.criacao.localeCompare(a.criacao));
  }, [grupos]);

  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [status, setStatus] = useState<'todas' | 'feitas' | 'previstas'>('todas');

  const toggle = (r: string) =>
    setSelecionadas(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));

  const selecao = selecionadas.length > 0 ? selecionadas : rotasDisponiveis.map(r => r.key);

  const [gerando, setGerando] = useState(false);

  const imprimir = async () => {
    setGerando(true);
    const linhas = grupos
      .filter(g => selecao.includes(chaveRota(g.rota ? String(g.rota) : 'sem', g.criadaEm)))
      .filter(g => status === 'todas' || (status === 'feitas' ? g.data <= hoje : g.data > hoje))
      .sort((a, b) => {
        const ra = a.rota ?? 99, rb = b.rota ?? 99;
        if (ra !== rb) return ra - rb;
        const oa = a.ordemRota ?? 99, ob = b.ordemRota ?? 99;
        if (oa !== ob) return oa - ob;
        return a.data.localeCompare(b.data);
      });

    const porRota = new Map<string, EntregaAgrupada[]>();
    linhas.forEach(g => {
      const key = chaveRota(g.rota ? String(g.rota) : 'sem', g.criadaEm);
      porRota.set(key, [...(porRota.get(key) ?? []), g]);
    });

    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

    const tituloRota = (key: string) => {
      const [rota, data] = key.split('|');
      const base = ROTA_LABEL[rota] ?? 'Entregas sem rota definida';
      return `${base} — criada em ${new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    };

    const mapas = new Map<string, string>();
    for (const [rota, lista] of porRota) {
      const vistos = new Set<string>();
      const cidades = lista
        .map((g, i) => ({
          municipio: g.municipio,
          codigo_ibge: g.itens[0]?.codigo_ibge ?? null,
          ordem: g.ordemRota ?? i + 1,
        }))
        .filter(c => {
          const k = (c.codigo_ibge ?? c.municipio).toString();
          if (vistos.has(k)) return false;
          vistos.add(k);
          return true;
        });
      mapas.set(rota, await buildRotaMapaSvg(cidades, tituloRota(rota)));
    }

    const secoes = Array.from(porRota.entries()).map(([rota, lista]) => `
      <h2>${esc(tituloRota(rota))} — ${lista.length} parada(s)</h2>
      ${mapas.get(rota) ?? ''}

      <table>
        <thead>
          <tr><th>#</th><th>Município</th><th>Região</th><th>Data</th><th>Status</th><th>Responsável</th><th>Materiais</th><th>Total</th><th>Conferido</th></tr>
        </thead>
        <tbody>
          ${lista.map((g, i) => `
            <tr>
              <td>${g.ordemRota ?? i + 1}</td>
              <td><strong>${esc(g.municipio)}</strong></td>
              <td>${esc(regiaoNome(g.macroregionId))}</td>
              <td>${new Date(g.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
              <td>${g.data <= hoje ? 'Feita' : 'Prevista'}</td>
              <td>${esc(respNome(g.responsavelId) ?? '—')}</td>
              <td>${esc(g.itens.map(i2 => `${i2.tipo_material}: ${i2.quantidade}`).join(' | '))}</td>
              <td>${g.total.toLocaleString('pt-BR')}</td>
              <td class="check"></td>
            </tr>`).join('')}
        </tbody>
      </table>`).join('');

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Rotas de distribuição de material</title>
      <style>
        *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;background:#fff;}
        h1{font-size:18px;margin:0 0 4px;}
        .sub{font-size:11px;color:#555;margin-bottom:16px;}
        h2{font-size:14px;margin:20px 0 6px;border-bottom:2px solid #1F5AB4;padding-bottom:3px;color:#1A2A45;}
        table{width:100%;border-collapse:collapse;font-size:10px;}
        th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top;}
        th{background:#eef2f7;color:#1A2A45;}
        .check{width:60px;}
        .mapa-rota{margin:8px 0 14px;page-break-inside:avoid;}
        .mapa-rota h3{font-size:11px;color:#1A2A45;margin:0 0 4px;}
        .mapa-rota svg{border:1px solid #ddd;border-radius:4px;max-width:100%;height:auto;}
        .mapa-legenda{margin-top:6px;line-height:1.6;}
        @media print{
          h2{page-break-after:avoid;}
          tr{page-break-inside:avoid;}
          html,body{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
        }

      </style></head><body>
      <h1>Rotas de distribuição de material</h1>
      <div class="sub">Emitido em ${new Date().toLocaleString('pt-BR')} · ${linhas.length} entrega(s)</div>
      ${secoes || '<p>Nenhuma entrega para os filtros selecionados.</p>'}
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`;

    const w = window.open('', '_blank');
    setGerando(false);
    if (!w) return;
    w.document.write(html);
    w.document.close();
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Imprimir rotas</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Selecione as rotas</Label>
            <div className="space-y-1.5 mt-2">
              {rotasDisponiveis.map(r => (
                <label key={r.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    checked={selecionadas.includes(r.key)}
                    onChange={() => toggle(r.key)}
                  />
                  {ROTA_LABEL[r.rota] ?? 'Sem rota definida'}
                  <span className="text-[11px] text-muted-foreground">
                    criada em {new Date(r.criacao + 'T12:00:00').toLocaleDateString('pt-BR')} · {r.total} entrega(s)
                  </span>
                </label>
              ))}
              {rotasDisponiveis.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhuma entrega registrada.</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Sem seleção, todas as rotas são impressas.
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Status das entregas</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Feitas e previstas</SelectItem>
                <SelectItem value="feitas">Somente feitas</SelectItem>
                <SelectItem value="previstas">Somente previstas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={imprimir} disabled={gerando} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> {gerando ? 'Gerando mapa…' : 'Imprimir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalheDialog({
  open, onOpenChange, tipo, feitas, previstas, regiaoNome, respNome,
}: {
  open: boolean;
  onOpenChange: () => void;
  tipo: 'feitas' | 'previstas' | 'itens-feitas' | 'itens-previstas' | null;
  feitas: EntregaAgrupada[];
  previstas: EntregaAgrupada[];
  regiaoNome: (id: string | null) => string;
  respNome: (id: string | null) => string | null;
}) {
  const config = {
    feitas: { titulo: 'Entregas realizadas', grupos: feitas, icone: CheckCircle2 },
    previstas: { titulo: 'Entregas previstas', grupos: previstas, icone: CalendarClock },
    'itens-feitas': { titulo: 'Itens entregues', grupos: feitas, icone: Package },
    'itens-previstas': { titulo: 'Itens previstos', grupos: previstas, icone: Truck },
  }[tipo ?? 'feitas'];

  const totalItens = config.grupos.reduce((s, g) => s + g.total, 0);
  const Icon = config.icone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5 text-primary" /> {config.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-2.5">
              <p className="text-xl font-bold">{config.grupos.length.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-muted-foreground">Entregas</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-2.5">
              <p className="text-xl font-bold">{totalItens.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-muted-foreground">Total de itens</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-2.5">
              <p className="text-xl font-bold">
                {new Set(config.grupos.map(g => g.municipio)).size.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-muted-foreground">Municípios</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 overflow-hidden">
          <Lista
            grupos={config.grupos}
            regiaoNome={regiaoNome}
            respNome={respNome}
            vazio="Nenhuma entrega para exibir."
          />
        </div>

        <DialogFooter className="pt-3">
          <Button variant="outline" size="sm" onClick={onOpenChange} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Relatório de entregas de Curitiba ----------

type PeriodoRel = 'dia' | 'semana' | 'mes';

function intervaloPeriodo(periodo: PeriodoRel, ref: string): { inicio: string; fim: string } {
  const d = new Date(ref + 'T12:00:00');
  if (periodo === 'dia') return { inicio: ref, fim: ref };
  if (periodo === 'mes') {
    const ini = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { inicio: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
  }
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  const ini = new Date(d); ini.setDate(d.getDate() - dow);
  const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
  return { inicio: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

function RelatorioCuritibaDialog({
  open, onOpenChange, grupos, respNome, hoje,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupos: EntregaAgrupada[];
  respNome: (id: string | null) => string | null;
  hoje: string;
}) {
  const [periodo, setPeriodo] = useState<PeriodoRel>('dia');
  const [ref, setRef] = useState(hoje);

  const { inicio, fim } = intervaloPeriodo(periodo, ref);

  const entregas = useMemo(() => grupos
    .filter(g => g.municipio.trim().toLowerCase() === 'curitiba')
    .filter(g => g.data >= inicio && g.data <= fim)
    .sort((a, b) => a.data.localeCompare(b.data)),
  [grupos, inicio, fim]);

  const fmtData = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  const labelPeriodo = periodo === 'dia'
    ? `Dia ${fmtData(ref)}`
    : periodo === 'semana'
      ? `Semana de ${fmtData(inicio)} a ${fmtData(fim)}`
      : `Mês de ${new Date(ref + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

  const totalItens = entregas.reduce((s, g) => s + g.total, 0);
  const feitas = entregas.filter(g => g.data <= hoje).length;
  const previstas = entregas.length - feitas;

  const gerar = () => {
    const porDia = new Map<string, EntregaAgrupada[]>();
    for (const g of entregas) porDia.set(g.data, [...(porDia.get(g.data) ?? []), g]);

    const porMaterial = new Map<string, number>();
    for (const g of entregas) for (const i of g.itens) {
      porMaterial.set(i.tipo_material, (porMaterial.get(i.tipo_material) ?? 0) + i.quantidade);
    }

    const secDias = Array.from(porDia.entries()).map(([data, gs]) => {
      const linhas = gs.map(g => `
        <tr>
          <td>${g.rota ? (ROTA_LABEL[String(g.rota)] ?? `Rota ${g.rota}`) : 'Sem rota'}</td>
          <td>${g.itens.map(i => `${i.tipo_material}: ${i.quantidade.toLocaleString('pt-BR')}`).join('<br/>')}</td>
          <td class="num">${g.total.toLocaleString('pt-BR')}</td>
          <td>${respNome(g.responsavelId) ?? '—'}</td>
          <td>${g.data <= hoje ? 'Realizada' : 'Prevista'}</td>
        </tr>`).join('');
      return `<h3>${fmtData(data)}</h3>
        <table><thead><tr><th>Rota</th><th>Materiais</th><th>Total</th><th>Responsável</th><th>Status</th></tr></thead>
        <tbody>${linhas}</tbody></table>`;
    }).join('');

    const resumoMat = Array.from(porMaterial.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m, q]) => `<tr><td>${m}</td><td class="num">${q.toLocaleString('pt-BR')}</td></tr>`).join('');

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
      <title>Relatório de entregas — Curitiba</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:13px}
        h1{font-size:20px;margin:0} h2{font-size:14px;color:#555;font-weight:400;margin:4px 0 0}
        h3{font-size:14px;margin:20px 0 6px}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f0f0f0} td.num{text-align:right;white-space:nowrap}
        .kpis{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}
        .kpi{border:1px solid #ccc;border-radius:6px;padding:10px 14px}
        .kpi b{font-size:18px;display:block}
        @media print{body{margin:12mm}}
      </style></head><body>
      <h1>Relatório de entregas — Curitiba</h1>
      <h2>${labelPeriodo} · gerado em ${new Date().toLocaleString('pt-BR')}</h2>
      <div class="kpis">
        <div class="kpi"><b>${entregas.length}</b>entregas no período</div>
        <div class="kpi"><b>${feitas}</b>realizadas</div>
        <div class="kpi"><b>${previstas}</b>previstas</div>
        <div class="kpi"><b>${totalItens.toLocaleString('pt-BR')}</b>itens no total</div>
      </div>
      <h3>Resumo por material</h3>
      <table><thead><tr><th>Material</th><th>Quantidade</th></tr></thead><tbody>${resumoMat || '<tr><td colspan="2">—</td></tr>'}</tbody></table>
      ${secDias || '<p>Nenhuma entrega para Curitiba no período.</p>'}
      <script>window.print()</script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-primary" /> Relatório de entregas — Curitiba
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={periodo} onValueChange={v => setPeriodo(v as PeriodoRel)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por dia</SelectItem>
                <SelectItem value="semana">Por semana</SelectItem>
                <SelectItem value="mes">Por mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              {periodo === 'dia' ? 'Data' : periodo === 'semana' ? 'Qualquer dia da semana' : 'Qualquer dia do mês'}
            </Label>
            <Input type="date" className="mt-1" value={ref} onChange={e => e.target.value && setRef(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            {labelPeriodo}: <strong className="text-foreground">{entregas.length}</strong> entrega(s) ·{' '}
            <strong className="text-foreground">{totalItens.toLocaleString('pt-BR')}</strong> itens
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button size="sm" className="gap-1.5" onClick={gerar} disabled={entregas.length === 0}>
            <Printer className="w-3.5 h-3.5" /> Gerar relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Lançamento de entrega com foto do kit ----------

function LancarEntregaDialog({ grupo, onClose }: { grupo: EntregaAgrupada | null; onClose: () => void }) {
  const confirmar = useConfirmarEntrega();
  const [foto, setFoto] = useState<File | null>(null);
  const [obs, setObs] = useState('');
  const [data, setData] = useState<string>('');
  const [carregadoPara, setCarregadoPara] = useState<string | null>(null);

  const grupoId = grupo?.grupoId ?? null;
  if (grupo && grupoId !== carregadoPara) {
    setCarregadoPara(grupoId);
    setFoto(null);
    setObs(grupo.entregaObs ?? '');
    setData(grupo.data);
  }
  if (!grupo && carregadoPara !== null) setCarregadoPara(null);

  const salvar = async () => {
    if (!grupo) return;
    await confirmar.mutateAsync({
      grupoEntregaId: grupo.grupoId,
      foto,
      observacao: obs || null,
      dataEntrega: data || null,
    });
    onClose();
  };

  return (
    <Dialog open={grupo !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Lançar entrega — {grupo?.municipio}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border/40 p-2.5">
            <p className="text-xs text-muted-foreground">Materiais desta entrega</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {grupo?.itens.map(i => (
                <Badge key={i.id} variant="outline" className="text-[10px]">
                  {i.tipo_material}: {i.quantidade.toLocaleString('pt-BR')}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Data da entrega</Label>
            <Input type="date" className="mt-1" value={data} onChange={e => setData(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Foto do kit entregue</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1"
              onChange={e => setFoto(e.target.files?.[0] ?? null)}
            />
            {foto && <p className="text-[11px] text-muted-foreground mt-1">Selecionada: {foto.name}</p>}
            {!foto && grupo?.fotoPath && (
              <p className="text-[11px] text-muted-foreground mt-1">Já existe uma foto registrada — envie outra para substituir.</p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
            <Textarea
              className="mt-1 min-h-[64px]"
              placeholder="Quem recebeu, condição do material, etc."
              value={obs}
              onChange={e => setObs(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={confirmar.isPending} onClick={salvar} className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {confirmar.isPending ? 'Salvando…' : 'Confirmar entrega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VerFotoDialog({ grupo, onClose }: { grupo: EntregaAgrupada | null; onClose: () => void }) {
  const { data: url, isLoading } = useFotoEntregaUrl(grupo?.fotoPath);
  return (
    <Dialog open={grupo !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Foto do kit — {grupo?.municipio}
          </DialogTitle>
        </DialogHeader>
        {isLoading && <p className="text-xs text-muted-foreground">Carregando foto…</p>}
        {url && <img src={url} alt={`Kit entregue em ${grupo?.municipio}`} className="w-full rounded-md border border-border/40" />}
        {grupo?.entregaObs && <p className="text-xs text-muted-foreground">{grupo.entregaObs}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
