import { useState } from 'react';
import { PlusCircle, Tag, Archive, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Item {
  id: string;
  nome: string;
  descricao: string | null;
  unidade: string;
}

interface ItensCampanhaTabProps {
  itens: Item[];
  isLoading: boolean;
  onCreate: (payload: { nome: string; descricao: string | null; unidade: string | null }) => void;
  isCreating: boolean;
}

export default function ItensCampanhaTab({ itens, isLoading, onCreate, isCreating }: ItensCampanhaTabProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('unidade');
  const [busca, setBusca] = useState('');

  const filtrados = busca.trim().length >= 2
    ? itens.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()))
    : itens;

  const podeSalvar = nome.trim().length > 0 && !isCreating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeSalvar) return;
    onCreate({ nome: nome.trim(), descricao: descricao.trim() || null, unidade: unidade.trim() || null });
    setNome('');
    setDescricao('');
    setUnidade('unidade');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-1 bg-card/80 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" /> Novo item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nome do material *</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Santinho"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Material de campanha pequeno"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unidade padrão</Label>
              <Input
                className="mt-1"
                placeholder="Ex: unidade, caixa, pacote"
                value={unidade}
                onChange={e => setUnidade(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!podeSalvar}>
              {isCreating ? 'Salvando…' : 'Cadastrar item'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 bg-card/80 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Archive className="w-4 h-4 text-primary" /> Portfólio de itens
            <Badge variant="secondary" className="ml-auto">{itens.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar item por nome…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando itens…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {busca.trim().length >= 2 ? 'Nenhum item encontrado para esta busca.' : 'Nenhum item cadastrado ainda.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtrados.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors"
                >
                  <Tag className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.descricao || 'Sem descrição'} · {item.unidade}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
