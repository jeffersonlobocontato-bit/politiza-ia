import { useState } from 'react';
import { Shield, Save, RefreshCw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RaioXReportViewer } from './RaioXReportViewer';

export interface PendingRaioX {
  session_id: string;
  html: string;
  markdown?: string;
  model?: string;
  context_input?: string;
  subject: {
    name: string;
    municipality?: string;
    party?: string;
    position?: string;
  };
  // referência ao ativo que originou (para escrever asset_origin/source_id corretos)
  asset: {
    origin: string;
    source_id: string | null;
    asset_key: string;
  };
}

interface Props {
  pending: PendingRaioX | null;
  onClose: () => void;
  onConfirm: (reviewerNotes: string) => void;
  onRedo: () => void;
  saving?: boolean;
}

export function RaioXReviewDialog({ pending, onClose, onConfirm, onRedo, saving }: Props) {
  const [notes, setNotes] = useState('');

  if (!pending) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-mono text-[10px] tracking-widest text-destructive uppercase">
                Revisão do RAIO-X
              </span>
              <span className="text-sm font-semibold">
                {pending.subject.name}
                {pending.subject.municipality ? ` — ${pending.subject.municipality}` : ''}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 overflow-hidden">
          <div className="overflow-hidden">
            <RaioXReportViewer html={pending.html} height="60vh" />
          </div>

          <div className="flex flex-col gap-3 overflow-auto pr-1">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Metadados
              </div>
              <dl className="text-xs space-y-1">
                {pending.subject.position && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Cargo</dt>
                    <dd className="text-right">{pending.subject.position}</dd>
                  </div>
                )}
                {pending.subject.party && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Partido</dt>
                    <dd className="text-right">{pending.subject.party}</dd>
                  </div>
                )}
                {pending.model && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Modelo</dt>
                    <dd className="text-right font-mono">{pending.model}</dd>
                  </div>
                )}
              </dl>
            </div>

            {pending.context_input && (
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                  Contexto informado
                </div>
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                  {pending.context_input}
                </p>
              </div>
            )}

            <div>
              <Label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                Notas do revisor <span className="opacity-60">(opcional)</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações do revisor sobre este relatório, ressalvas, próximos passos..."
                rows={5}
                className="mt-1.5 text-sm"
              />
            </div>

            <div className="text-[11px] text-muted-foreground leading-relaxed p-2 rounded border border-amber-500/20 bg-amber-500/5">
              Revise o relatório acima antes de salvar. Se identificar divergências, use
              <strong className="text-amber-600"> Refazer análise </strong>
              para reabrir o painel RAIO-X e gerar novamente com um contexto ajustado.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-shrink-0 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Descartar
          </Button>
          <Button variant="outline" onClick={onRedo} disabled={saving} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refazer análise
          </Button>
          <Button
            onClick={() => onConfirm(notes)}
            disabled={saving}
            className="gap-2 bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar no perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
