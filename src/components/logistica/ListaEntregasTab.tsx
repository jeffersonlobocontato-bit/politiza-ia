import { useMemo, useState } from 'react';
import { Printer, Search, Truck, CheckCircle2, CalendarClock, MapPinned, Package, X, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LogisticaEnvio, LogisticaResponsavel } from '@/hooks/useLogisticaMaterial';
import { buildRotaMapaSvg } from '@/lib/rotaMapaSvg';
import { useDeleteEntregaGrupo, useUpdateEnvioQuantidade } from '@/hooks/useLogisticaMaterial';

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
          <Button size="sm" onClick={() => setShowPrint(true)} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Imprimir rotas
          </Button>
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
            <TabsList>
              <TabsTrigger value="feitas" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Feitas ({feitas.length})
              </TabsTrigger>
              <TabsTrigger value="previstas" className="gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Previstas ({previstas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feitas" className="mt-3">
              <Lista grupos={feitas} regiaoNome={regiaoNome} respNome={respNome} onDelete={setConfirmar} vazio="Nenhuma entrega realizada com os filtros atuais." />
            </TabsContent>
            <TabsContent value="previstas" className="mt-3">
              <Lista grupos={previstas} regiaoNome={regiaoNome} respNome={respNome} onDelete={setConfirmar} vazio="Nenhuma entrega prevista com os filtros atuais." />
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
  grupos, regiaoNome, respNome, vazio, onDelete,
}: {
  grupos: EntregaAgrupada[];
  regiaoNome: (id: string | null) => string;
  respNome: (id: string | null) => string | null;
  vazio: string;
  onDelete?: (g: EntregaAgrupada) => void;
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
        </div>
      ))}
    </div>
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
  const rotasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    grupos.forEach(g => set.add(g.rota ? String(g.rota) : 'sem'));
    return Array.from(set).sort();
  }, [grupos]);

  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [status, setStatus] = useState<'todas' | 'feitas' | 'previstas'>('todas');

  const toggle = (r: string) =>
    setSelecionadas(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));

  const selecao = selecionadas.length > 0 ? selecionadas : rotasDisponiveis;

  const [gerando, setGerando] = useState(false);

  const imprimir = async () => {
    setGerando(true);
    const linhas = grupos
      .filter(g => selecao.includes(g.rota ? String(g.rota) : 'sem'))
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
      const key = g.rota ? String(g.rota) : 'sem';
      porRota.set(key, [...(porRota.get(key) ?? []), g]);
    });

    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

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
      mapas.set(rota, await buildRotaMapaSvg(cidades, ROTA_LABEL[rota] ?? 'Entregas sem rota definida'));
    }

    const secoes = Array.from(porRota.entries()).map(([rota, lista]) => `
      <h2>${esc(ROTA_LABEL[rota] ?? 'Entregas sem rota definida')} — ${lista.length} parada(s)</h2>
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
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;}
        h1{font-size:18px;margin:0 0 4px;}
        .sub{font-size:11px;color:#555;margin-bottom:16px;}
        h2{font-size:14px;margin:20px 0 6px;border-bottom:2px solid #1F5AB4;padding-bottom:3px;}
        table{width:100%;border-collapse:collapse;font-size:10px;}
        th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top;}
        th{background:#eef2f7;}
        .check{width:60px;}
        .mapa-rota{margin:8px 0 14px;page-break-inside:avoid;}
        .mapa-rota h3{font-size:11px;color:#1A2A45;margin:0 0 4px;}
        .mapa-rota svg{border:1px solid #ddd;border-radius:4px;}
        .mapa-legenda{margin-top:6px;line-height:1.6;}
        @media print{ h2{page-break-after:avoid;} tr{page-break-inside:avoid;} }
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
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    checked={selecionadas.includes(r)}
                    onChange={() => toggle(r)}
                  />
                  {ROTA_LABEL[r] ?? 'Sem rota definida'}
                  <span className="text-[11px] text-muted-foreground">
                    ({grupos.filter(g => (g.rota ? String(g.rota) : 'sem') === r).length} entregas)
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
