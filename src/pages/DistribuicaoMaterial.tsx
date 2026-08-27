import { useEffect, useMemo, useState } from 'react';
import { Package, Search, UserPlus, Truck, Home, MapPinned, Users2, ThermometerSun, Vote, Warehouse } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useMacroRegions, useDomiciliosMunicipios, useUpdateDomicilios, useUpdateEleitores,
  useSearchResponsaveis, useAllResponsaveis, useCreateResponsavel,
  useEnviosMaterial, useCreateEnvio,
  computeCobertura, computeResumoPorRegiao,
  type DomicilioMunicipio, type LogisticaResponsavel, type LogisticaEnvio,
} from '@/hooks/useLogisticaMaterial';

const TIPOS_MATERIAL = [
  'Perfurado Moro', 'Perfurado Trio', 'Perfurado Quarteto', 'Bola', 'Bola Foto', 'Bola Marca',
  'Praguinha', 'Bandeira', 'Colinha', 'Perfurado Filipe', 'Ret/Foto Filipe', 'Bola Filipe',
  'Santinho', 'Adesivo', 'Cartaz', 'Camiseta', 'Outro',
];

// Endereço do depósito/central de logística em Curitiba, onde ocorrem as retiradas
const ENDERECO_DEPOSITO_CURITIBA = 'Rua Carlos De Laeti, 2605, Hauer, Curitiba';

// Estoque de referência informado na planilha de logística (não é deduzido automaticamente —
// serve apenas para o gestor conferir se ainda há saldo disponível ao registrar uma retirada)
const ESTOQUE_REFERENCIA = [
  { material: 'Bolas', quantidade: 50000 },
  { material: 'Foto/Moro', quantidade: 30000 },
  { material: 'Perfurado Quarteto', quantidade: 5000 },
  { material: 'Perfurados Flávio/Moro', quantidade: 5000 },
  { material: 'Praguinhas', quantidade: 300000 },
  { material: 'Bandeiras', quantidade: 450 },
  { material: 'Perfurado Senadores', quantidade: 450 },
];

// Checklist fixo do "Recibo de Retirada de Material de Campanha" usado no depósito de Curitiba
const RECIBO_MATERIAIS = [
  'Praguinha', 'Adesivo bola (FOTO)', 'Adesivo bola (MARCA)', 'Colinha 9x5',
  'Perfurado (MARCA)', 'Perfurado (FOTO)', 'Perfurado (SENADORES)', 'Bandeira',
];

// ---------- Escala de calor ----------

function heatColor(pct: number | null) {
  if (pct === null) return { bar: 'bg-muted-foreground/30', text: 'text-muted-foreground', label: 'Sem estimativa' };
  if (pct >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-500', label: 'Cobertura alta' };
  if (pct >= 60) return { bar: 'bg-lime-500', text: 'text-lime-500', label: 'Cobertura boa' };
  if (pct >= 35) return { bar: 'bg-amber-500', text: 'text-amber-500', label: 'Cobertura parcial' };
  if (pct > 0) return { bar: 'bg-orange-600', text: 'text-orange-600', label: 'Cobertura baixa' };
  return { bar: 'bg-destructive', text: 'text-destructive', label: 'Sem material enviado' };
}

function HeatBar({ pct, showLabel = true }: { pct: number | null; showLabel?: boolean }) {
  const c = heatColor(pct);
  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', c.bar)} style={{ width: `${pct ?? 100}%`, opacity: pct === null ? 0.25 : 1 }} />
      </div>
      {showLabel && (
        <p className={cn('text-[11px] font-medium', c.text)}>
          {pct === null ? 'Sem estimativa de domicílios' : `${pct}% dos domicílios cobertos`}
        </p>
      )}
    </div>
  );
}

export default function DistribuicaoMaterial() {
  const { data: macroRegions = [] } = useMacroRegions();
  const { data: domicilios = [], isLoading: loadingDomicilios } = useDomiciliosMunicipios();
  const { data: envios = [] } = useEnviosMaterial();
  const { data: responsaveisAll = [] } = useAllResponsaveis();
  const createEnvio = useCreateEnvio();
  const updateDomicilios = useUpdateDomicilios();
  const updateEleitores = useUpdateEleitores();

  // ---------- Estado do formulário ----------
  const [filtroRegiao, setFiltroRegiao] = useState<string>('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState<DomicilioMunicipio | null>(null);
  const [itens, setItens] = useState<{ tipo_material: string; quantidade: string }[]>([
    { tipo_material: TIPOS_MATERIAL[0], quantidade: '' },
  ]);
  const [rota, setRota] = useState<string>('');
  const [ordemRota, setOrdemRota] = useState<string>('');
  const [dataEnvio, setDataEnvio] = useState(() => new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [domicilioManual, setDomicilioManual] = useState('');
  const [eleitoresManual, setEleitoresManual] = useState('');

  const [responsavelBusca, setResponsavelBusca] = useState('');
  const [responsavelSelecionado, setResponsavelSelecionado] = useState<LogisticaResponsavel | null>(null);
  const [showCadastrarResponsavel, setShowCadastrarResponsavel] = useState(false);

  const { data: sugestoesResponsavel = [] } = useSearchResponsaveis(responsavelBusca);

  const sugestoesCidade = useMemo(() => {
    if (cidadeBusca.trim().length < 1) return [];
    const q = cidadeBusca.toLowerCase();
    return domicilios
      .filter(d => (!filtroRegiao || d.macroregion_id === filtroRegiao) && d.municipio.toLowerCase().includes(q))
      .slice(0, 8);
  }, [cidadeBusca, filtroRegiao, domicilios]);

  // ---------- Cobertura em tempo real ----------
  const jaEnviadoNaCidade = useMemo(() => {
    if (!cidadeSelecionada) return 0;
    return envios
      .filter(e => e.codigo_ibge === cidadeSelecionada.codigo_ibge)
      .reduce((sum, e) => sum + e.quantidade, 0);
  }, [cidadeSelecionada, envios]);

  const domiciliosEfetivo = cidadeSelecionada?.domicilios_estimado
    ?? (domicilioManual ? Number(domicilioManual) : null);

  const totalKitAtual = useMemo(
    () => itens.reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0),
    [itens]
  );

  const coberturaPreview = useMemo(() => {
    if (!domiciliosEfetivo || domiciliosEfetivo <= 0) return null;
    const totalComEsteEnvio = jaEnviadoNaCidade + totalKitAtual;
    return Math.min(100, Math.round((totalComEsteEnvio / domiciliosEfetivo) * 1000) / 10);
  }, [domiciliosEfetivo, jaEnviadoNaCidade, totalKitAtual]);

  // ---------- Dashboard agregado ----------
  const cobertura = useMemo(() => computeCobertura(domicilios, envios), [domicilios, envios]);
  const resumoRegioes = useMemo(() => computeResumoPorRegiao(cobertura, macroRegions), [cobertura, macroRegions]);

  const totalDistribuido = envios.reduce((s, e) => s + e.quantidade, 0);
  const municipiosAtendidos = cobertura.filter(c => c.quantidade_enviada > 0).length;
  const comEstimativa = cobertura.filter(c => c.cobertura_pct !== null);
  const coberturaMediaGeral = comEstimativa.length > 0
    ? Math.round((comEstimativa.reduce((s, c) => s + (c.cobertura_pct ?? 0), 0) / comEstimativa.length) * 10) / 10
    : null;
  const eleitoresAtendidos = cobertura
    .filter(c => c.quantidade_enviada > 0)
    .reduce((s, c) => s + (c.eleitores_estimado ?? 0), 0);

  const resetForm = () => {
    setCidadeBusca(''); setCidadeSelecionada(null);
    setItens([{ tipo_material: TIPOS_MATERIAL[0], quantidade: '' }]);
    setRota(''); setOrdemRota('');
    setObservacoes(''); setDomicilioManual(''); setEleitoresManual('');
    setResponsavelBusca(''); setResponsavelSelecionado(null);
  };

  const addItem = () => setItens(prev => [...prev, { tipo_material: TIPOS_MATERIAL[0], quantidade: '' }]);
  const removeItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<{ tipo_material: string; quantidade: string }>) =>
    setItens(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const canSubmit = cidadeSelecionada && totalKitAtual > 0 && dataEnvio;

  const handleSubmit = async () => {
    if (!cidadeSelecionada || !canSubmit) return;
    if (domicilioManual && !cidadeSelecionada.domicilios_estimado) {
      await updateDomicilios.mutateAsync({
        codigo_ibge: cidadeSelecionada.codigo_ibge,
        domicilios_estimado: Number(domicilioManual),
      });
    }
    if (eleitoresManual && !cidadeSelecionada.eleitores_estimado) {
      await updateEleitores.mutateAsync({
        codigo_ibge: cidadeSelecionada.codigo_ibge,
        eleitores_estimado: Number(eleitoresManual),
      });
    }
    await createEnvio.mutateAsync({
      municipio: cidadeSelecionada.municipio,
      codigo_ibge: cidadeSelecionada.codigo_ibge,
      macroregion_id: cidadeSelecionada.macroregion_id,
      itens: itens.map(it => ({ tipo_material: it.tipo_material, quantidade: Number(it.quantidade) || 0 })),
      responsavel_id: responsavelSelecionado?.id ?? null,
      data_envio: dataEnvio,
      observacoes: observacoes || null,
      rota: rota ? Number(rota) : null,
      ordem_rota: ordemRota ? Number(ordemRota) : null,
    });
    resetForm();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Distribuição de Material
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre envios de material por município, o responsável pela retirada ou recebimento,
          e acompanhe a cobertura estimada frente aos domicílios de cada cidade.
        </p>
      </div>

      <Tabs defaultValue="entregas" className="space-y-5">
        <TabsList>
          <TabsTrigger value="entregas" className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Entregas por rota
          </TabsTrigger>
          <TabsTrigger value="lista" className="flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" /> Lista de entregas
          </TabsTrigger>
          <TabsTrigger value="retiradas" className="flex items-center gap-1.5">
            <Warehouse className="w-3.5 h-3.5" /> Retiradas em Curitiba
          </TabsTrigger>
        </TabsList>


        <TabsContent value="entregas" className="space-y-5 mt-0">
      {/* ---------- Formulário de novo envio ---------- */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> Nova entrega de material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Filtrar por região (opcional)</Label>
              <Select value={filtroRegiao || 'todas'} onValueChange={v => setFiltroRegiao(v === 'todas' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Todas as regiões" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as regiões</SelectItem>
                  {macroRegions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 relative">
              <Label className="text-xs text-muted-foreground">Município de destino</Label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Digite para buscar entre os 399 municípios do PR…"
                  value={cidadeSelecionada ? cidadeSelecionada.municipio : cidadeBusca}
                  onChange={e => { setCidadeSelecionada(null); setCidadeBusca(e.target.value); setDomicilioManual(''); }}
                />
              </div>
              {!cidadeSelecionada && sugestoesCidade.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border border-border/50 rounded-md bg-popover divide-y divide-border/30 max-h-56 overflow-y-auto shadow-lg">
                  {sugestoesCidade.map(m => (
                    <button
                      key={m.codigo_ibge}
                      onClick={() => { setCidadeSelecionada(m); setCidadeBusca(''); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors flex items-center justify-between"
                    >
                      <span>{m.municipio}</span>
                      <span className="text-[10px] text-muted-foreground text-right">
                        {m.domicilios_estimado ? `${m.domicilios_estimado.toLocaleString('pt-BR')} domicílios` : 'sem estimativa'}
                        {m.eleitores_estimado ? ` · ${m.eleitores_estimado.toLocaleString('pt-BR')} eleitores` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {cidadeSelecionada && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPinned className="w-3.5 h-3.5 text-primary" /> {cidadeSelecionada.municipio}
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {macroRegions.find(r => r.id === cidadeSelecionada.macroregion_id)?.name ?? cidadeSelecionada.macroregion_id}
                  </Badge>
                </p>
                <span className="text-xs text-muted-foreground">
                  Já enviado nesta cidade: <strong>{jaEnviadoNaCidade.toLocaleString('pt-BR')}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cidadeSelecionada.domicilios_estimado ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Home className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Domicílios estimados:</span>
                    <strong>{cidadeSelecionada.domicilios_estimado.toLocaleString('pt-BR')}</strong>
                  </div>
                ) : (
                  <div className="flex-1">
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Home className="w-3 h-3" /> Sem levantamento de domicílios — informe uma estimativa
                    </Label>
                    <Input
                      type="number" min={0} className="mt-1 h-8 text-sm"
                      placeholder="Nº estimado de domicílios no município"
                      value={domicilioManual}
                      onChange={e => setDomicilioManual(e.target.value)}
                    />
                  </div>
                )}

                {cidadeSelecionada.eleitores_estimado ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Vote className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Eleitores:</span>
                    <strong>{cidadeSelecionada.eleitores_estimado.toLocaleString('pt-BR')}</strong>
                  </div>
                ) : (
                  <div className="flex-1">
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Vote className="w-3 h-3" /> Sem número de eleitores — informe se souber
                    </Label>
                    <Input
                      type="number" min={0} className="mt-1 h-8 text-sm"
                      placeholder="Nº de eleitores no município"
                      value={eleitoresManual}
                      onChange={e => setEleitoresManual(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ThermometerSun className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <HeatBar pct={coberturaPreview} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Rota (opcional)</Label>
              <Select value={rota || 'nenhuma'} onValueChange={v => setRota(v === 'nenhuma' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sem rota" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem rota</SelectItem>
                  <SelectItem value="1">Rota 1 — azul</SelectItem>
                  <SelectItem value="2">Rota 2 — branca</SelectItem>
                  <SelectItem value="3">Rota 3 — amarela</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nº da parada na rota (opcional)</Label>
              <Input
                type="number" min={1} className="mt-1"
                value={ordemRota} onChange={e => setOrdemRota(e.target.value)}
                placeholder="Ex: 1ª parada"
                disabled={!rota}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data do envio</Label>
              <Input type="date" className="mt-1" value={dataEnvio} onChange={e => setDataEnvio(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Materiais do kit desta entrega</Label>
            {itens.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={item.tipo_material} onValueChange={v => updateItem(idx, { tipo_material: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_MATERIAL.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Input
                    type="number" min={1} className="mt-1"
                    value={item.quantidade} onChange={e => updateItem(idx, { quantidade: e.target.value })}
                    placeholder="Quantidade"
                  />
                </div>
                <Button
                  type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                  disabled={itens.length === 1} onClick={() => removeItem(idx)}
                >
                  Remover
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              + Adicionar material ao kit
            </Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Responsável pela retirada/recebimento</Label>
            <div className="relative">
              <div className="relative mt-1">
                <Users2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar pelo nome…"
                  value={responsavelSelecionado ? responsavelSelecionado.nome : responsavelBusca}
                  onChange={e => { setResponsavelSelecionado(null); setResponsavelBusca(e.target.value); }}
                />
              </div>
              {!responsavelSelecionado && responsavelBusca.trim().length >= 2 && (
                <div className="absolute z-10 mt-1 w-full border border-border/50 rounded-md bg-popover divide-y divide-border/30 max-h-48 overflow-y-auto shadow-lg">
                  {sugestoesResponsavel.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setResponsavelSelecionado(r); setResponsavelBusca(''); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors flex items-center justify-between"
                    >
                      <span>{r.nome}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {r.tag_tipo === 'cidade' ? r.municipio : macroRegions.find(m => m.id === r.macroregion_id)?.name}
                      </Badge>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCadastrarResponsavel(true)}
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted/40 transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo responsável “{responsavelBusca}”
                  </button>
                </div>
              )}
              {!responsavelSelecionado && responsavelBusca.trim().length < 2 && (
                <button
                  onClick={() => setShowCadastrarResponsavel(true)}
                  className="text-[11px] text-primary hover:underline mt-1 flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> Cadastrar responsável
                </button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
            <Textarea
              className="mt-1 text-sm" rows={2}
              placeholder="Ponto de retirada, condição do material, etc."
              value={observacoes} onChange={e => setObservacoes(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button disabled={!canSubmit || createEnvio.isPending} onClick={handleSubmit}>
              {createEnvio.isPending ? 'Registrando…' : 'Registrar entrega'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Dashboard ---------- */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground">Panorama da distribuição</h2>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <BigNumber label="Material distribuído" value={totalDistribuido.toLocaleString('pt-BR')} icon={Package} />
          <BigNumber label="Municípios atendidos" value={`${municipiosAtendidos} / ${domicilios.length}`} icon={MapPinned} />
          <BigNumber
            label="Cobertura média"
            value={coberturaMediaGeral !== null ? `${coberturaMediaGeral}%` : '—'}
            icon={ThermometerSun}
          />
          <BigNumber label="Eleitores nas cidades atendidas" value={eleitoresAtendidos.toLocaleString('pt-BR')} icon={Vote} />
          <BigNumber label="Responsáveis cadastrados" value={String(responsaveisAll.length)} icon={Users2} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {resumoRegioes.map(r => (
            <Card key={r.macroregion_id} className="bg-card/80 border-border/50">
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-semibold">{r.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {r.total_enviado.toLocaleString('pt-BR')} itens · {r.municipios_atendidos}/{r.municipios_total} municípios atendidos
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Vote className="w-3 h-3" /> {r.eleitores_total.toLocaleString('pt-BR')} eleitores na região
                </p>
                <HeatBar pct={r.cobertura_media_pct} />
              </CardContent>
            </Card>
          ))}
        </div>
        {loadingDomicilios && (
          <p className="text-xs text-muted-foreground">Carregando levantamento de domicílios…</p>
        )}
      </div>
        </TabsContent>

        <TabsContent value="retiradas" className="space-y-5 mt-0">
          <RetiradasCuritibaTab
            domicilios={domicilios}
            envios={envios}
            macroRegions={macroRegions}
          />
        </TabsContent>
      </Tabs>

      {/* ---------- Dialog: cadastrar responsável ---------- */}
      <CadastrarResponsavelDialog
        open={showCadastrarResponsavel}
        onOpenChange={setShowCadastrarResponsavel}
        nomeInicial={responsavelBusca}
        cidadeAtual={cidadeSelecionada?.municipio ?? null}
        regiaoAtual={cidadeSelecionada?.macroregion_id ?? filtroRegiao ?? null}
        macroRegions={macroRegions}
        onCreated={(r) => { setResponsavelSelecionado(r); setResponsavelBusca(''); setShowCadastrarResponsavel(false); }}
      />
    </div>
  );
}

function BigNumber({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="bg-card/80 border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RetiradasCuritibaTab({
  domicilios, envios, macroRegions,
}: {
  domicilios: DomicilioMunicipio[]; envios: LogisticaEnvio[]; macroRegions: { id: string; name: string }[];
}) {
  const createEnvio = useCreateEnvio();
  const { data: responsaveisAll = [] } = useAllResponsaveis();

  const curitiba = useMemo(() => domicilios.find(d => d.municipio === 'Curitiba') ?? null, [domicilios]);

  const proximoRecibo = useMemo(() => {
    const retiradasComRecibo = envios.filter(e => e.tipo_movimentacao === 'retirada' && e.recibo_numero);
    const numeros = retiradasComRecibo
      .map(e => Number(e.recibo_numero))
      .filter(n => !Number.isNaN(n));
    return numeros.length > 0 ? String(Math.max(...numeros) + 1) : '1';
  }, [envios]);

  // ---------- Estado do formulário — reflete o Recibo de Retirada de Material de Campanha ----------
  const [reciboNumero, setReciboNumero] = useState('');
  const [dataRetirada, setDataRetirada] = useState(() => new Date().toISOString().split('T')[0]);
  const [responsavelEntrega, setResponsavelEntrega] = useState('');
  const [checklist, setChecklist] = useState<{ material: string; marcado: boolean; quantidade: string; observacao: string }[]>(
    RECIBO_MATERIAIS.map(material => ({ material, marcado: false, quantidade: '', observacao: '' }))
  );

  const [responsavelBusca, setResponsavelBusca] = useState('');
  const [responsavelSelecionado, setResponsavelSelecionado] = useState<LogisticaResponsavel | null>(null);
  const [showCadastrarResponsavel, setShowCadastrarResponsavel] = useState(false);

  const { data: sugestoesResponsavel = [] } = useSearchResponsaveis(responsavelBusca);

  const toggleMarcado = (idx: number) =>
    setChecklist(prev => prev.map((it, i) => (i === idx ? { ...it, marcado: !it.marcado } : it)));
  const updateChecklist = (idx: number, patch: Partial<{ quantidade: string; observacao: string }>) =>
    setChecklist(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const itensMarcados = checklist.filter(it => it.marcado && Number(it.quantidade) > 0);
  const totalKitAtual = itensMarcados.reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0);

  const canSubmit = curitiba && itensMarcados.length > 0 && dataRetirada && responsavelSelecionado;

  const resetForm = () => {
    setReciboNumero(''); setResponsavelEntrega('');
    setChecklist(RECIBO_MATERIAIS.map(material => ({ material, marcado: false, quantidade: '', observacao: '' })));
    setResponsavelBusca(''); setResponsavelSelecionado(null);
  };

  const handleSubmit = async () => {
    if (!curitiba || !canSubmit) return;
    await createEnvio.mutateAsync({
      municipio: curitiba.municipio,
      codigo_ibge: curitiba.codigo_ibge,
      macroregion_id: curitiba.macroregion_id,
      itens: itensMarcados.map(it => ({
        tipo_material: it.material, quantidade: Number(it.quantidade) || 0, observacao: it.observacao || null,
      })),
      responsavel_id: responsavelSelecionado?.id ?? null,
      data_envio: dataRetirada,
      tipo_movimentacao: 'retirada',
      recibo_numero: reciboNumero || null,
      responsavel_entrega: responsavelEntrega || null,
    });
    resetForm();
  };

  const retiradas = useMemo(() => {
    const porGrupo = new Map<string, LogisticaEnvio[]>();
    for (const e of envios) {
      if (e.tipo_movimentacao !== 'retirada') continue;
      const list = porGrupo.get(e.grupo_entrega_id) ?? [];
      list.push(e);
      porGrupo.set(e.grupo_entrega_id, list);
    }
    return Array.from(porGrupo.entries())
      .map(([grupoId, itensGrupo]) => ({
        grupoId,
        data: itensGrupo[0].data_envio,
        responsavelId: itensGrupo[0].responsavel_id,
        reciboNumero: itensGrupo[0].recibo_numero,
        responsavelEntrega: itensGrupo[0].responsavel_entrega,
        itens: itensGrupo,
        total: itensGrupo.reduce((s, i) => s + i.quantidade, 0),
      }))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [envios]);

  const totalRetirado = retiradas.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-5">
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-primary" /> Recibo de retirada de material — Curitiba
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 space-y-1">
            <p className="text-xs text-foreground flex items-center gap-1.5">
              <MapPinned className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <strong>Local de retirada:</strong> {ENDERECO_DEPOSITO_CURITIBA}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ESTOQUE_REFERENCIA.map(e => (
                <Badge key={e.material} variant="outline" className="text-[10px] font-normal">
                  {e.material}: {e.quantidade.toLocaleString('pt-BR')}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Estoque de referência informado no planejamento da remessa — confira antes de registrar, não é descontado automaticamente.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Segue o mesmo formato do recibo físico usado no depósito: nº do recibo, quem retira,
            checklist de materiais com quantidade e observação, e quem entregou.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Recibo nº</Label>
              <Input
                className="mt-1" value={reciboNumero} onChange={e => setReciboNumero(e.target.value)}
                placeholder={`Sugestão: ${proximoRecibo}`}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data da retirada</Label>
              <Input type="date" className="mt-1" value={dataRetirada} onChange={e => setDataRetirada(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Responsável pela entrega (depósito)</Label>
              <Input
                className="mt-1" value={responsavelEntrega} onChange={e => setResponsavelEntrega(e.target.value)}
                placeholder="Quem entregou o material"
              />
            </div>
          </div>

          <div className="relative">
            <Label className="text-xs text-muted-foreground">Nome de quem retira</Label>
            <div className="relative mt-1">
              <Users2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar pelo nome…"
                value={responsavelSelecionado ? responsavelSelecionado.nome : responsavelBusca}
                onChange={e => { setResponsavelSelecionado(null); setResponsavelBusca(e.target.value); }}
              />
            </div>
            {responsavelSelecionado?.telefone && (
              <p className="text-[11px] text-muted-foreground mt-1">Telefone: {responsavelSelecionado.telefone}</p>
            )}
            {!responsavelSelecionado && responsavelBusca.trim().length >= 2 && (
              <div className="absolute z-10 mt-1 w-full border border-border/50 rounded-md bg-popover divide-y divide-border/30 max-h-48 overflow-y-auto shadow-lg">
                {sugestoesResponsavel.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setResponsavelSelecionado(r); setResponsavelBusca(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors flex items-center justify-between"
                  >
                    <span>{r.nome}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {r.tag_tipo === 'cidade' ? r.municipio : macroRegions.find(m => m.id === r.macroregion_id)?.name}
                    </Badge>
                  </button>
                ))}
                <button
                  onClick={() => setShowCadastrarResponsavel(true)}
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted/40 transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo responsável "{responsavelBusca}"
                </button>
              </div>
            )}
            {!responsavelSelecionado && responsavelBusca.trim().length < 2 && (
              <button
                onClick={() => setShowCadastrarResponsavel(true)}
                className="text-[11px] text-primary hover:underline mt-1 flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Cadastrar responsável
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Declaro que retirei, nesta data, os materiais abaixo relacionados:
            </Label>
            <div className="rounded-md border border-border/40 divide-y divide-border/30">
              <div className="grid grid-cols-[auto_1fr_100px_1fr] gap-2 px-2.5 py-1.5 bg-muted/30 text-[11px] font-medium text-muted-foreground">
                <span>Marcar</span><span>Material</span><span>Quantidade</span><span>Observação</span>
              </div>
              {checklist.map((item, idx) => (
                <div key={item.material} className="grid grid-cols-[auto_1fr_100px_1fr] gap-2 px-2.5 py-2 items-center">
                  <input
                    type="checkbox" checked={item.marcado}
                    onChange={() => toggleMarcado(idx)}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                  <span className={cn('text-sm', !item.marcado && 'text-muted-foreground')}>{item.material}</span>
                  <Input
                    type="number" min={1} className="h-8 text-sm"
                    disabled={!item.marcado}
                    value={item.quantidade}
                    onChange={e => updateChecklist(idx, { quantidade: e.target.value })}
                  />
                  <Input
                    className="h-8 text-sm"
                    disabled={!item.marcado}
                    placeholder="Opcional"
                    value={item.observacao}
                    onChange={e => updateChecklist(idx, { observacao: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {totalKitAtual > 0 && (
              <p className="text-[11px] text-muted-foreground">Total marcado: {totalKitAtual.toLocaleString('pt-BR')} itens</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button disabled={!canSubmit || createEnvio.isPending} onClick={handleSubmit}>
              {createEnvio.isPending ? 'Registrando…' : 'Registrar retirada'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <BigNumber label="Total retirado em Curitiba" value={totalRetirado.toLocaleString('pt-BR')} icon={Warehouse} />
          <BigNumber label="Retiradas registradas" value={String(retiradas.length)} icon={Package} />
        </div>

        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Histórico de retiradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {retiradas.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhuma retirada registrada ainda.</p>
            )}
            {retiradas.map(r => {
              const resp = responsaveisAll.find(x => x.id === r.responsavelId);
              return (
                <div key={r.grupoId} className="rounded-md border border-border/40 p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {resp?.nome ?? 'Responsável não identificado'}
                      {r.reciboNumero && <span className="text-muted-foreground font-normal"> · Recibo nº {r.reciboNumero}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')} · {r.total.toLocaleString('pt-BR')} itens
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.itens.map(i => (
                      <Badge key={i.id} variant="outline" className="text-[10px]">
                        {i.tipo_material}: {i.quantidade.toLocaleString('pt-BR')}
                      </Badge>
                    ))}
                  </div>
                  {r.responsavelEntrega && (
                    <p className="text-[11px] text-muted-foreground">Entregue por: {r.responsavelEntrega}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <CadastrarResponsavelDialog
        open={showCadastrarResponsavel}
        onOpenChange={setShowCadastrarResponsavel}
        nomeInicial={responsavelBusca}
        cidadeAtual="Curitiba"
        regiaoAtual={curitiba?.macroregion_id ?? null}
        macroRegions={macroRegions}
        onCreated={(r) => { setResponsavelSelecionado(r); setResponsavelBusca(''); setShowCadastrarResponsavel(false); }}
      />
    </div>
  );
}


function CadastrarResponsavelDialog({
  open, onOpenChange, nomeInicial, cidadeAtual, regiaoAtual, macroRegions, onCreated,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; nomeInicial: string;
  cidadeAtual: string | null; regiaoAtual: string | null;
  macroRegions: { id: string; name: string }[];
  onCreated: (r: LogisticaResponsavel) => void;
}) {
  const createResponsavel = useCreateResponsavel();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState('');
  const [tagTipo, setTagTipo] = useState<'cidade' | 'regiao'>(cidadeAtual ? 'cidade' : 'regiao');
  const [municipioTag, setMunicipioTag] = useState(cidadeAtual ?? '');
  const [regiaoTag, setRegiaoTag] = useState(regiaoAtual ?? '');

  useEffect(() => { setNome(nomeInicial); }, [nomeInicial]);

  const canSave = nome.trim() && (tagTipo === 'cidade' ? municipioTag.trim() : regiaoTag);

  const handleSave = async () => {
    if (!canSave) return;
    const created = await createResponsavel.mutateAsync({
      nome: nome.trim(),
      telefone: telefone || null,
      tag_tipo: tagTipo,
      municipio: tagTipo === 'cidade' ? municipioTag.trim() : null,
      macroregion_id: tagTipo === 'regiao' ? regiaoTag : null,
    });
    setNome(''); setTelefone(''); setMunicipioTag(''); setRegiaoTag('');
    onCreated(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Cadastrar responsável</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input autoFocus className="mt-1" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Telefone (opcional)</Label>
            <Input className="mt-1" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tag de abrangência</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button" size="sm" variant={tagTipo === 'cidade' ? 'default' : 'outline'}
                className="flex-1 text-xs" onClick={() => setTagTipo('cidade')}
              >
                Cidade específica
              </Button>
              <Button
                type="button" size="sm" variant={tagTipo === 'regiao' ? 'default' : 'outline'}
                className="flex-1 text-xs" onClick={() => setTagTipo('regiao')}
              >
                Região
              </Button>
            </div>
          </div>
          {tagTipo === 'cidade' ? (
            <div>
              <Label className="text-xs text-muted-foreground">Município</Label>
              <Input className="mt-1" value={municipioTag} onChange={e => setMunicipioTag(e.target.value)} placeholder="Nome do município" />
            </div>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">Região</Label>
              <Select value={regiaoTag} onValueChange={setRegiaoTag}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a região" /></SelectTrigger>
                <SelectContent>
                  {macroRegions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" disabled={!canSave || createResponsavel.isPending} onClick={handleSave}>
            {createResponsavel.isPending ? 'Salvando…' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
