import { useMemo, useState } from 'react';
import { Shield, ExternalLink, AlertCircle, Search, FileText, Eye, Trash2, Calendar, MapPin } from 'lucide-react';
import { openRaioX } from '@/components/ativos/RaioXModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RaioXReportViewer } from '@/components/ativos/RaioXReportViewer';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useRaioXReports, useDeleteRaioXReport, type RaioXReport } from '@/hooks/useRaioXReports';

export default function DueDiligence() {
  const { roles, loading: authLoading } = useAuth();
  const canAccess = roles.some(r =>
    ['admin_master', 'coordenador_estadual', 'coordenador_geral'].includes(r),
  );

  const [nome, setNome] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [partido, setPartido] = useState('');
  const [cargo, setCargo] = useState('');
  const [cpf, setCpf] = useState('');
  const [contexto, setContexto] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<RaioXReport | null>(null);
  const [deleting, setDeleting] = useState<RaioXReport | null>(null);

  const { data: reports = [], isLoading } = useRaioXReports();
  const deleteReport = useDeleteRaioXReport();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) =>
      [r.subject_name, r.subject_municipality, r.subject_party, r.subject_position]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [reports, search]);

  const totals = useMemo(() => {
    const now = Date.now();
    const days30 = 30 * 24 * 60 * 60 * 1000;
    const municipalities = new Set(reports.map(r => r.subject_municipality).filter(Boolean));
    return {
      total: reports.length,
      last30: reports.filter(r => now - new Date(r.created_at).getTime() < days30).length,
      cities: municipalities.size,
    };
  }, [reports]);

  if (authLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
    );
  }
  if (!canAccess) return <Navigate to="/" replace />;


  const podeIniciar = nome.trim().length > 3 && municipio.trim().length > 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeIniciar) return;
    openRaioX({ nome, municipio, partido, cargo, cpf, contexto });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <div className="font-mono text-[11px] tracking-widest text-destructive uppercase">
            RAIO-X Intelligence
          </div>
          <h1 className="text-2xl font-bold text-foreground">Due Diligence</h1>
          <p className="text-sm text-muted-foreground">
            Investigação de qualquer nome — não precisa estar cadastrado na plataforma.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={<FileText className="h-4 w-4" />} label="Investigações totais" value={totals.total} />
        <KpiCard icon={<Calendar className="h-4 w-4" />} label="Últimos 30 dias" value={totals.last30} />
        <KpiCard icon={<MapPin className="h-4 w-4" />} label="Municípios investigados" value={totals.cities} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova investigação</CardTitle>
          <CardDescription>
            Preencha os dados abaixo. O painel RAIO-X abre em nova aba e dispara a pesquisa
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  Nome completo
                  <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive py-0">
                    OBRIGATÓRIO
                  </Badge>
                </Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do investigado" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  Município
                  <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive py-0">
                    OBRIGATÓRIO
                  </Badge>
                </Label>
                <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Ex: Paranaguá" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Partido</Label>
                <Input value={partido} onChange={(e) => setPartido(e.target.value)} placeholder="Ex: PL, MDB..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Cargo / Função</Label>
                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Vereador, Secretário, Empresário" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  CPF <span className="opacity-60">(opcional)</span>
                </Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/[^\d.\-\s]/g, '').slice(0, 14))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                Contexto adicional <span className="opacity-60">(opcional)</span>
              </Label>
              <Textarea
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="Ex: investigar ligação com grupo X, verificar processos, sócios, imóveis..."
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                A investigação usa fontes públicas (Jusbrasil, Escavador, Receita Federal, TSE, mídia
                regional). O painel abre em nova aba e a pesquisa é disparada automaticamente.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!podeIniciar}
                className="gap-2 bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25"
              >
                <Shield className="h-4 w-4" />
                Iniciar RAIO-X
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Histórico de investigações</CardTitle>
            <CardDescription>
              Todos os relatórios RAIO-X salvos na plataforma.
            </CardDescription>
          </div>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, município, partido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Carregando histórico...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {reports.length === 0
                ? 'Nenhuma investigação salva ainda. Inicie um RAIO-X acima.'
                : 'Nenhum relatório corresponde à busca.'}
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/25 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{r.subject_name}</span>
                      {r.subject_party && (
                        <Badge variant="outline" className="text-[10px] py-0">{r.subject_party}</Badge>
                      )}
                      {r.subject_position && (
                        <Badge variant="secondary" className="text-[10px] py-0">{r.subject_position}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      {r.subject_municipality && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.subject_municipality}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </span>
                      {r.model && <span className="font-mono opacity-70">{r.model}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(r)} className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(r)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewer modal */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              {viewing?.subject_name}
              {viewing?.subject_municipality && (
                <span className="text-sm font-normal text-muted-foreground">
                  · {viewing.subject_municipality}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="flex-1 min-h-0">
              <RaioXReportViewer html={viewing.report_html} height="100%" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              O relatório de <strong>{deleting?.subject_name}</strong> será removido do histórico.
              Esta ação pode ser revertida no banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) deleteReport.mutate(deleting.id);
                setDeleting(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/25 flex items-center justify-center text-destructive">
          {icon}
        </div>
        <div>
          <div className="text-xs font-mono uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold text-foreground leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
