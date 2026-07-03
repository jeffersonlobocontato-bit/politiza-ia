import { useState } from 'react';
import { Shield, ExternalLink, AlertCircle } from 'lucide-react';
import { openRaioX } from '@/components/ativos/RaioXModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function DueDiligence() {
  const { roles } = useAuth();
  const canAccess = roles.some(r =>
    ['admin_master', 'coordenador_estadual', 'coordenador_geral'].includes(r),
  );

  const [nome, setNome] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [partido, setPartido] = useState('');
  const [cargo, setCargo] = useState('');
  const [contexto, setContexto] = useState('');

  if (!canAccess) return <Navigate to="/" replace />;

  const podeIniciar = nome.trim().length > 3 && municipio.trim().length > 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeIniciar) return;
    openRaioX({ nome, municipio, partido, cargo, contexto });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
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
                <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  Partido
                </Label>
                <Input value={partido} onChange={(e) => setPartido(e.target.value)} placeholder="Ex: PL, MDB..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  Cargo / Função
                </Label>
                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Vereador, Secretário, Empresário" />
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
    </div>
  );
}
