import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { RaioXDados, AtivoParaRaioX } from '@/types/raioX';

interface RaioXModalProps {
  ativo: AtivoParaRaioX;
  open: boolean;
  onClose: () => void;
  onConfirm: (dados: RaioXDados) => void;
}

export function RaioXModal({ ativo, open, onClose, onConfirm }: RaioXModalProps) {
  const [nome, setNome] = useState(ativo.name ?? '');
  const [municipio, setMunicipio] = useState(ativo.municipality ?? '');
  const [partido, setPartido] = useState(ativo.party ?? '');
  const [cargo, setCargo] = useState(ativo.position ?? '');
  const [contexto, setContexto] = useState('');

  const temNome = nome.trim().length > 3;
  const temMunicipio = municipio.trim().length > 2;
  const podeConfirmar = temNome && temMunicipio;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-mono text-[10px] tracking-widest text-destructive uppercase">RAIO-X Intelligence</span>
              <span className="text-sm font-semibold">Iniciar Investigação</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Confirme os dados abaixo antes de iniciar a pesquisa de due diligence.
          </p>
        </div>

        <div className="space-y-4">
          <Field label="Nome Completo" required valid={temNome}>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </Field>
          <Field label="Município" required valid={temMunicipio}>
            <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Ex: Pontal do Paraná" />
          </Field>
          <Field label="Partido">
            <Input value={partido} onChange={(e) => setPartido(e.target.value)} placeholder="Ex: PL, MDB, PT..." />
          </Field>
          <Field label="Cargo / Função">
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Vereador, Secretário..." />
          </Field>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono tracking-wide text-muted-foreground uppercase">
              Contexto adicional <span className="opacity-60">(opcional)</span>
            </Label>
            <Textarea
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex: investigar ligação com grupo X, verificar processos de 2019..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={() => onConfirm({ nome, municipio, partido, cargo, contexto })}
            disabled={!podeConfirmar}
            className="flex-1 gap-2 bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25"
          >
            <Shield className="h-4 w-4" />
            Iniciar RAIO-X
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  valid,
  children,
}: {
  label: string;
  required?: boolean;
  valid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono tracking-wide text-muted-foreground uppercase flex items-center gap-2">
        {label}
        {required && (
          <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive py-0">
            OBRIGATÓRIO
          </Badge>
        )}
        {valid && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
      </Label>
      {children}
    </div>
  );
}

export function openRaioX(dados: RaioXDados, sessionId?: string) {
  const sid = sessionId ?? (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  const params = new URLSearchParams({
    nome: dados.nome,
    municipio: dados.municipio,
    partido: dados.partido ?? '',
    cargo: dados.cargo ?? '',
    cpf: dados.cpf ?? '',
    contexto: dados.contexto ?? '',
    auto: 'true',
    session_id: sid,
  });
  const backendUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (backendUrl) {
    params.set('api', `${backendUrl}/functions/v1/raio-x-chat`);
  }
  const base = '/raio-x';
  // NOTE: precisa manter opener para receber postMessage de volta — não usar 'noopener'
  window.open(`${base}?${params.toString()}`, '_blank', 'noreferrer');
  return sid;
}
