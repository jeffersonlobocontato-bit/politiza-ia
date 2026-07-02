import { useState, useMemo } from 'react';
import { MapPin, Plus, Trash2, GripVertical, Pencil, CalendarPlus, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useMalhaMunicipios, groupByHub, useAddSatelite, useRenameSatelite,
  useRemoveSatelite, useReorderSatelites, useGerarCiclo, type PrMunicipio,
} from '@/hooks/useMalhaLogistica';
import { PR_MUNICIPIOS } from '@/data/prMunicipiosPR';

export default function MalhaLogistica() {
  const { data: rows = [], isLoading } = useMalhaMunicipios();
  const { hubs, byHub } = useMemo(() => groupByHub(rows), [rows]);
  const [openHubId, setOpenHubId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredHubs = search.trim()
    ? hubs.filter(h =>
        h.nome.toLowerCase().includes(search.toLowerCase()) ||
        (byHub.get(h.id) ?? []).some(s => s.nome.toLowerCase().includes(search.toLowerCase()))
      )
    : hubs;

  const totalSatelites = rows.filter(r => !r.is_hub).length;

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando malha logística…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Malha Logística de Campo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hubs.length} cidades principais · {totalSatelites} cidades satélite mapeadas
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cidade principal ou satélite…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredHubs.map(hub => (
          <HubCard
            key={hub.id}
            hub={hub}
            satelites={byHub.get(hub.id) ?? []}
            open={openHubId === hub.id}
            onToggle={() => setOpenHubId(openHubId === hub.id ? null : hub.id)}
          />
        ))}
      </div>
    </div>
  );
}

function HubCard({
  hub, satelites, open, onToggle,
}: { hub: PrMunicipio; satelites: PrMunicipio[]; open: boolean; onToggle: () => void }) {
  const addSatelite = useAddSatelite();
  const renameSatelite = useRenameSatelite();
  const removeSatelite = useRemoveSatelite();
  const reorder = useReorderSatelites();
  const gerarCiclo = useGerarCiclo();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [suggestions, setSuggestions] = useState<typeof PR_MUNICIPIOS>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showGerarCiclo, setShowGerarCiclo] = useState(false);
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [dragId, setDragId] = useState<string | null>(null);

  const overflow = Math.max(satelites.length - 30, 0);

  const handleSearchCity = (q: string) => {
    setNewName(q);
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const qn = q.toLowerCase();
    setSuggestions(PR_MUNICIPIOS.filter(m => m.nome.toLowerCase().includes(qn)).slice(0, 6));
  };

  const confirmAdd = (m: typeof PR_MUNICIPIOS[number]) => {
    addSatelite.mutate({ hub_id: hub.id, nome: m.nome, lat: m.lat, lng: m.lng });
    setNewName(''); setSuggestions([]); setShowAdd(false);
  };

  const startRename = (s: PrMunicipio) => { setEditingId(s.id); setEditingName(s.nome); };
  const confirmRename = () => {
    if (editingId && editingName.trim()) renameSatelite.mutate({ id: editingId, nome: editingName.trim() });
    setEditingId(null);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = satelites.map(s => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    reorder.mutate(ids);
    setDragId(null);
  };

  return (
    <Card className={cn('bg-card/80 border-border/50 transition-all', open && 'ring-1 ring-primary/40')}>
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-bold">{hub.nome}</CardTitle>
          {overflow > 0
            ? <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">+{overflow} p/ ciclo 2</Badge>
            : <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500">ciclo completo</Badge>}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="w-3 h-3" /> {hub.pessoas_sede} na sede · {hub.pessoas_campo} em campo · {satelites.length} satélites mapeadas
        </p>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-2">
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {satelites.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                Nenhuma cidade satélite mapeada — adicione a primeira abaixo.
              </p>
            )}
            {satelites.map((s, idx) => (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5 bg-muted/20',
                  idx >= 30 && 'border-destructive/30 bg-destructive/5',
                  dragId === s.id && 'opacity-40'
                )}
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab flex-shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground w-10 flex-shrink-0">
                  {idx < 30 ? `D${idx + 1}` : '—'}
                </span>
                {editingId === s.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmRename()}
                    onBlur={confirmRename}
                    className="h-7 text-xs flex-1"
                  />
                ) : (
                  <span className="text-xs flex-1 truncate">{s.nome}</span>
                )}
                <button onClick={() => startRename(s)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeSatelite.mutate(s.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar cidade
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs bg-primary"
              onClick={() => setShowGerarCiclo(true)}
              disabled={satelites.length === 0}
            >
              <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Gerar ciclo na Agenda
            </Button>
          </div>
        </CardContent>
      )}

      {/* Dialog: adicionar cidade */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar cidade satélite — {hub.nome}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nome do município</Label>
            <Input
              value={newName}
              onChange={e => handleSearchCity(e.target.value)}
              placeholder="Digite para buscar entre os 399 municípios do PR…"
              autoFocus
            />
            {suggestions.length > 0 && (
              <div className="border border-border/50 rounded-md divide-y divide-border/30 max-h-56 overflow-y-auto">
                {suggestions.map(m => (
                  <button
                    key={m.codigoIbge}
                    onClick={() => confirmAdd(m)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: gerar ciclo */}
      <Dialog open={showGerarCiclo} onOpenChange={setShowGerarCiclo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Gerar ciclo de 30 dias — {hub.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Isso cria {Math.min(satelites.length, 30)} eventos de ativação/panfletagem na Agenda —
              um por dia, a partir da data escolhida, na ordem atual do ciclo.
              {overflow > 0 && (
                <span className="block mt-1 text-destructive text-xs">
                  As {overflow} cidades além do dia 30 não entram neste ciclo — rode "Gerar ciclo" de novo depois pra cobrir o restante.
                </span>
              )}
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">Data de início do ciclo</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowGerarCiclo(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={gerarCiclo.isPending}
              onClick={async () => {
                await gerarCiclo.mutateAsync({ hub, satelites, dataInicio });
                setShowGerarCiclo(false);
              }}
            >
              {gerarCiclo.isPending ? 'Gerando…' : 'Gerar ciclo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
