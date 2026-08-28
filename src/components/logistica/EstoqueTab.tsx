import { useMemo, useState } from 'react';
import { Boxes, PlusCircle, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useEstoqueEntradas, useCreateEstoqueEntrada, useDeleteEstoqueEntrada,
  computeSaldoEstoque,
  type LogisticaEnvio, type LogisticaItemCampanha,
} from '@/hooks/useLogisticaMaterial';

const fmt = (n: number) => n.toLocaleString('pt-BR');

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

interface Props {
  itens: LogisticaItemCampanha[];
  envios: LogisticaEnvio[];
}

export default function EstoqueTab({ itens, envios }: Props) {
  const { data: entradas = [], isLoading } = useEstoqueEntradas();
  const createEntrada = useCreateEstoqueEntrada();
  const deleteEntrada = useDeleteEstoqueEntrada();

  const [material, setMaterial] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().slice(0, 10));
  const [fornecedor, setFornecedor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState<string>('todos');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const saldos = useMemo(() => computeSaldoEstoque(entradas, envios), [entradas, envios]);

  const totais = useMemo(() => saldos.reduce(
    (acc, s) => ({ entrada: acc.entrada + s.entrada, saida: acc.saida + s.saida, saldo: acc.saldo + s.saldo }),
    { entrada: 0, saida: 0, saldo: 0 },
  ), [saldos]);

  const materiaisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    itens.forEach(i => set.add(i.nome));
    entradas.forEach(e => set.add(e.tipo_material));
    envios.forEach(e => set.add(e.tipo_material));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [itens, entradas, envios]);

  const entradasFiltradas = useMemo(() => (
    filtroMaterial === 'todos' ? entradas : entradas.filter(e => e.tipo_material === filtroMaterial)
  ), [entradas, filtroMaterial]);

  const podeSalvar = material.trim().length > 0 && Number(quantidade) > 0 && !!dataEntrada;

  function handleSubmit() {
    if (!podeSalvar) return;
    const item = itens.find(i => i.nome === material);
    createEntrada.mutate(
      {
        item_id: item?.id ?? null,
        tipo_material: material,
        quantidade: Number(quantidade),
        data_entrada: dataEntrada,
        fornecedor: fornecedor.trim() || null,
        observacoes: observacoes.trim() || null,
      },
      {
        onSuccess: () => {
          setQuantidade('');
          setFornecedor('');
          setObservacoes('');
        },
      },
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Total cadastrado
            </p>
            <p className="text-2xl font-semibold mt-1">{fmt(totais.entrada)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Já entregue
            </p>
            <p className="text-2xl font-semibold mt-1">{fmt(totais.saida)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" /> Saldo em estoque
            </p>
            <p className={cn('text-2xl font-semibold mt-1', totais.saldo < 0 ? 'text-destructive' : 'text-emerald-500')}>
              {fmt(totais.saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Cadastro de entrada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Cadastrar entrada de estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                <SelectContent>
                  {materiaisDisponiveis.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum item cadastrado</div>
                  ) : materiaisDisponiveis.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input
                  type="number" min={1} inputMode="numeric"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data da entrada</Label>
                <Input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor / origem</Label>
              <Input value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Gráfica, doação, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Nota fiscal, lote..." />
            </div>
            <Button className="w-full" disabled={!podeSalvar || createEntrada.isPending} onClick={handleSubmit}>
              {createEntrada.isPending ? 'Salvando...' : 'Adicionar ao estoque'}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              As entradas são cumulativas por data. O saldo desconta automaticamente tudo que já foi entregue nas rotas.
            </p>
          </CardContent>
        </Card>

        {/* Saldo por material */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saldo por material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {saldos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
            ) : saldos.map(s => {
              const pct = s.entrada > 0 ? Math.min(100, Math.round((s.saida / s.entrada) * 100)) : 0;
              return (
                <div key={s.tipo_material} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm">{s.tipo_material}</p>
                    <Badge variant={s.saldo < 0 ? 'destructive' : 'secondary'}>
                      Saldo {fmt(s.saldo)}
                    </Badge>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', s.saldo < 0 ? 'bg-destructive' : 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Cadastrado {fmt(s.entrada)} · Entregue {fmt(s.saida)} ({pct}%)
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Histórico de entradas</CardTitle>
          <Select value={filtroMaterial} onValueChange={setFiltroMaterial}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os materiais</SelectItem>
              {materiaisDisponiveis.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando entradas...</p>
          ) : entradasFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma entrada cadastrada.</p>
          ) : entradasFiltradas.map(e => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.tipo_material}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.data_entrada)}
                  {e.fornecedor ? ` · ${e.fornecedor}` : ''}
                  {e.observacoes ? ` · ${e.observacoes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">+{fmt(e.quantidade)}</Badge>
                <Button
                  size="icon" variant="ghost"
                  onClick={() => setConfirmDelete({ id: e.id, label: `${e.tipo_material} (+${fmt(e.quantidade)})` })}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover entrada de estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.label} será removido do total cadastrado e o saldo será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteEntrada.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
