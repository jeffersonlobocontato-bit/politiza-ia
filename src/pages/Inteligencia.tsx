import { useMemo, useState } from 'react';
import {
  LayoutDashboard, AlertTriangle, Target, Users, ClipboardList, GitCompare,
  Church, GraduationCap, MapPin, ArrowRight, TrendingUp, TrendingDown, Minus, Heart, Shield,
  Sparkles, Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import AnaliseIAChat from '@/components/inteligencia/AnaliseIAChat';
import { Button } from '@/components/ui/button';
import { useSurveys } from '@/hooks/useSurveys';

// ============================================================
// DADOS
// ============================================================
const PESQUISAS = [
  { inst: 'Neokemp', data: '2026-04-20', cand: 'Sérgio Moro', pct: 47.8, n: 1008, margem: 3.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Neokemp', data: '2026-04-20', cand: 'Requião Filho', pct: 19.0, n: 1008, margem: 3.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Neokemp', data: '2026-04-20', cand: 'Rafael Greca', pct: 9.4, n: 1008, margem: 3.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Neokemp', data: '2026-04-20', cand: 'Sandro Alex', pct: 8.2, n: 1008, margem: 3.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Neokemp', data: '2026-04-20', cand: 'Tony Garcia', pct: 0.9, n: 1008, margem: 3.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Neokemp', data: '2026-04-20', cand: 'Luiz França', pct: 0.6, n: 1008, margem: 3.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP mai/26', data: '2026-05-09', cand: 'Sérgio Moro', pct: 42.6, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP mai/26', data: '2026-05-09', cand: 'Requião Filho', pct: 19.7, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP mai/26', data: '2026-05-09', cand: 'Rafael Greca', pct: 16.3, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP mai/26', data: '2026-05-09', cand: 'Sandro Alex', pct: 8.6, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP mai/26', data: '2026-05-09', cand: 'Tony Garcia', pct: 0.8, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP mai/26', data: '2026-05-09', cand: 'Luiz França', pct: 0.8, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Veritá', data: '2026-05-03', cand: 'Sérgio Moro', pct: 44.2, n: 2010, margem: 2.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Veritá', data: '2026-05-03', cand: 'Requião Filho', pct: 18.5, n: 2010, margem: 2.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Veritá', data: '2026-05-03', cand: 'Rafael Greca', pct: 8.7, n: 2010, margem: 2.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'Veritá', data: '2026-05-03', cand: 'Sandro Alex', pct: 7.1, n: 2010, margem: 2.5, cargo: 'Governador', cenario: 'C1' },
  { inst: 'IGR', data: '2026-06-15', cand: 'Sérgio Moro', pct: 38.2, n: 800, margem: 3.8, cargo: 'Governador', cenario: 'C1' },
  { inst: 'IGR', data: '2026-06-15', cand: 'Requião Filho', pct: 16.1, n: 800, margem: 3.8, cargo: 'Governador', cenario: 'C1' },
  { inst: 'IGR', data: '2026-06-15', cand: 'Sandro Alex', pct: 14.4, n: 800, margem: 3.8, cargo: 'Governador', cenario: 'C1' },
  { inst: 'IGR', data: '2026-06-15', cand: 'Rafael Greca', pct: 7.3, n: 800, margem: 3.8, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP jun/26', data: '2026-06-08', cand: 'Sérgio Moro', pct: 42.3, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP jun/26', data: '2026-06-08', cand: 'Requião Filho', pct: 19.9, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP jun/26', data: '2026-06-08', cand: 'Rafael Greca', pct: 13.9, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP jun/26', data: '2026-06-08', cand: 'Sandro Alex', pct: 10.7, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP jun/26', data: '2026-06-08', cand: 'Tony Garcia', pct: 1.4, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
  { inst: 'PP jun/26', data: '2026-06-08', cand: 'Luiz França', pct: 0.9, n: 1500, margem: 2.6, cargo: 'Governador', cenario: 'C1' },
];

const SEGMENTOS = [
  { nome: 'Praticantes religiosos', pct: 48.6, status: 'forte', acao: 'Ampliar presença em eventos religiosos' },
  { nome: 'Ensino superior', pct: 50.8, status: 'forte', acao: 'Proteger com debates técnicos e propostas' },
  { nome: 'Masculino', pct: 46.1, status: 'forte', acao: 'Base consolidada — manter' },
  { nome: '45–59 anos', pct: 45.1, status: 'forte', acao: 'Segmento maduro e fiel' },
  { nome: '60+ anos', pct: 44.8, status: 'forte', acao: 'Alta fidelidade, baixa volatilidade' },
  { nome: 'Feminino', pct: 38.9, status: 'oportunidade', acao: 'Gap de 7,2 p.p. vs masculino — crescimento possível' },
  { nome: '16–24 anos', pct: 36.5, status: 'oportunidade', acao: 'Menor faixa — digital e pautas de futuro' },
  { nome: 'Ensino fundamental', pct: 31.6, status: 'oportunidade', acao: 'Linguagem simples, presença no interior' },
  { nome: 'Não praticantes religiosos', pct: 35.5, status: 'oportunidade', acao: 'Gap de 13,1 p.p. — explorar pautas laicas' },
];

const REJEICAO = [
  { cand: 'Requião Filho', pct: 35.0 },
  { cand: 'Sérgio Moro', pct: 23.6 },
  { cand: 'Rafael Greca', pct: 13.2 },
  { cand: 'Tony Garcia', pct: 11.3 },
  { cand: 'Sandro Alex', pct: 9.1 },
  { cand: 'Luiz França', pct: 7.9 },
];

const LIMIARES = [
  { rival: 'Sandro Alex', atual: 10.7, tendencia: 'subindo', alerta: 13, critico: 16, statusAtual: 'monitorar' },
  { rival: 'Requião Filho', atual: 19.9, tendencia: 'estável', alerta: 23, critico: 28, statusAtual: 'ok' },
  { rival: 'Rafael Greca', atual: 13.9, tendencia: 'caindo', alerta: 16, critico: 20, statusAtual: 'ok' },
  { rival: 'Rejeição Moro', atual: 23.6, tendencia: 'estável', alerta: 28, critico: 35, statusAtual: 'ok' },
];

const ACOES = [
  { prioridade: 'urgente', acao: 'Consolidar alianças regionais PSD/PP', objetivo: 'Antecipar apoio de Ratinho a Sandro', segmento: 'Lideranças do interior' },
  { prioridade: 'urgente', acao: "Comunicação 'voto útil no 1º turno'", objetivo: 'Converter percepção em voto ativo', segmento: 'Indecisos e jovens' },
  { prioridade: 'alta', acao: 'Agenda em eventos religiosos', objetivo: 'Ampliar gap no eleitorado praticante', segmento: 'Evangélicos e católicos' },
  { prioridade: 'alta', acao: 'Presença no interior (Cascavel, Maringá, Londrina)', objetivo: 'Capturar votos de Greca em queda', segmento: 'Classe média conservadora' },
  { prioridade: 'alta', acao: 'Pautas de segurança e família', objetivo: 'Fechar gap feminino 35–59 anos', segmento: 'Mulheres +35' },
  { prioridade: 'media', acao: 'Debates com postura presidencial', objetivo: 'Proteger voto de ensino superior', segmento: 'Alta escolaridade' },
  { prioridade: 'media', acao: 'Comunicação digital para jovens', objetivo: 'Crescer em 16–24 anos (hoje 36,5%)', segmento: 'Jovens eleitores' },
  { prioridade: 'continuo', acao: 'Monitoramento semanal de Sandro Alex', objetivo: 'Detectar cruzamento do limiar de 13%', segmento: '—' },
];

const COR_CAND: Record<string, string> = {
  'Sérgio Moro': '#2a78d6',
  'Sandro Alex': '#eda100',
  'Requião Filho': '#e34948',
  'Rafael Greca': '#1baf7a',
  'Tony Garcia': '#9ca3af',
  'Luiz França': '#9ca3af',
};

// ============================================================
// AGREGADOR
// ============================================================
function calcularAgregado(pesquisas: typeof PESQUISAS, institutos: string[]) {
  const hoje = new Date();
  const filtradas = pesquisas.filter(p =>
    institutos.includes(p.inst) && p.cargo === 'Governador' && p.cenario === 'C1'
  );
  const candidatos = [...new Set(filtradas.map(p => p.cand))];
  return candidatos.map(cand => {
    const entradas = filtradas.filter(p => p.cand === cand);
    let somaW = 0, somaP = 0;
    entradas.forEach(e => {
      const dias = (hoje.getTime() - new Date(e.data).getTime()) / 86400000;
      const decaimento = Math.pow(0.5, dias / 30);
      const peso = decaimento * Math.sqrt(e.n);
      somaW += peso;
      somaP += e.pct * peso;
    });
    return { cand, pct: somaW > 0 ? somaP / somaW : 0 };
  }).sort((a, b) => b.pct - a.pct);
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
const KpiCard = ({ titulo, valor, sublabel, cor }: { titulo: string; valor: string; sublabel: string; cor: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className="text-3xl font-bold mt-1" style={{ color: cor }}>{valor}</div>
      <div className="text-xs text-muted-foreground mt-2">{sublabel}</div>
    </CardContent>
  </Card>
);

const TendenciaIcon = ({ t }: { t: string }) => {
  if (t === 'subindo') return <TrendingUp className="w-4 h-4 text-amber-500" />;
  if (t === 'caindo') return <TrendingDown className="w-4 h-4 text-emerald-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

// ============================================================
// PÁGINA
// ============================================================
export default function Inteligencia() {
  const [incluirIGR, setIncluirIGR] = useState(false);

  const institutosAtivos = useMemo(() => {
    const base = ['Neokemp', 'PP mai/26', 'Veritá', 'PP jun/26'];
    return incluirIGR ? [...base, 'IGR'] : base;
  }, [incluirIGR]);

  const agregado = useMemo(() => calcularAgregado(PESQUISAS, institutosAtivos), [institutosAtivos]);

  const ppJun = PESQUISAS.filter(p => p.inst === 'PP jun/26').sort((a, b) => b.pct - a.pct);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inteligência de Campanha</h1>
          <p className="text-sm text-muted-foreground">
            Análise estratégica · Sérgio Moro · Governo do Paraná 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" className="gap-2">
            <Link to="/pesquisas/base?upload=1">
              <Upload className="w-4 h-4" /> Upload de pesquisa
            </Link>
          </Button>
          <a href="/pesquisas/base" className="text-sm px-3 py-2 rounded-md border hover:bg-muted transition-colors">
            Ver base completa de pesquisas →
          </a>
          <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
          <Switch id="igr" checked={incluirIGR} onCheckedChange={setIncluirIGR} />
          <Label htmlFor="igr" className="text-xs leading-tight">
            Incluir IGR no agregado
            {incluirIGR && (
              <span className="block text-[10px] text-amber-600 max-w-[280px] mt-1">
                ⚠ Instituto contratado pelo governo do PR em jun/26 — discrepância de +3,7 a +7,3 p.p. vs demais.
              </span>
            )}
          </Label>
          </div>
        </div>
      </div>

      <Tabs defaultValue="painel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 h-auto">
          <TabsTrigger value="painel" className="gap-2"><LayoutDashboard className="w-4 h-4" />Painel Geral</TabsTrigger>
          <TabsTrigger value="cruzamento" className="gap-2"><GitCompare className="w-4 h-4" />Cruzamento</TabsTrigger>
          <TabsTrigger value="ameacas" className="gap-2"><AlertTriangle className="w-4 h-4" />Ameaças</TabsTrigger>
          <TabsTrigger value="oport" className="gap-2"><Target className="w-4 h-4" />Oportunidades</TabsTrigger>
          <TabsTrigger value="rivais" className="gap-2"><Users className="w-4 h-4" />Raio-X</TabsTrigger>
          <TabsTrigger value="acoes" className="gap-2"><ClipboardList className="w-4 h-4" />Ações</TabsTrigger>
          <TabsTrigger value="ia" className="gap-2"><Sparkles className="w-4 h-4" />Análise IA</TabsTrigger>
        </TabsList>

        {/* ============= ABA 1: PAINEL GERAL ============= */}
        <TabsContent value="painel" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard titulo="Intenção de voto" valor="42,3%" sublabel="PP jun/26 · estável" cor="#2a78d6" />
            <KpiCard titulo="Percepção de vitória" valor="47,9%" sublabel="eleitores acham que Moro ganha" cor="#1baf7a" />
            <KpiCard titulo="Rejeição" valor="23,6%" sublabel="2º menor do campo" cor="#eda100" />
            <KpiCard titulo="Votos válidos estim." valor="~47%" sublabel="excluindo brancos/nulos" cor="#2a78d6" />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Posicionamento no campo — PP jun/26</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={ppJun} layout="vertical" margin={{ left: 20, right: 50 }}>
                  <XAxis type="number" domain={[0, 50]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="cand" width={120} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                    {ppJun.map((d, i) => (
                      <Cell key={i} fill={COR_CAND[d.cand] ?? '#9ca3af'} />
                    ))}
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Agregado ponderado ({institutosAtivos.length} institutos)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {agregado.map(a => (
                  <div key={a.cand} className="flex items-center gap-3">
                    <div className="w-32 text-sm">{a.cand}</div>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${(a.pct / 50) * 100}%`, background: COR_CAND[a.cand] ?? '#9ca3af' }} />
                    </div>
                    <div className="w-14 text-right text-sm font-semibold">{a.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-semibold mb-3">Segmentos demográficos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SEGMENTOS.map(s => (
                <div key={s.nome}
                     className="p-4 rounded-md border bg-card"
                     style={{ borderLeft: `4px solid ${s.status === 'forte' ? '#1baf7a' : '#eda100'}` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{s.nome}</div>
                    <Badge variant={s.status === 'forte' ? 'default' : 'secondary'}
                           className={s.status === 'forte' ? 'bg-emerald-600' : 'bg-amber-500'}>
                      {s.status}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mt-2">{s.pct}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.acao}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4 text-sm">
              Requião estável com teto alto — 35% de rejeição limita crescimento.
            </CardContent></Card>
            <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4 text-sm">
              Sandro Alex crescendo — +2,1 p.p. mai→jun. Monitorar apoio de Ratinho Jr.
            </CardContent></Card>
            <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-4 text-sm">
              Greca em queda — votos disponíveis para captura no interior.
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* ============= ABA 2: AMEAÇAS ============= */}
        <TabsContent value="ameacas" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Limiares de monitoramento</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {LIMIARES.map(l => (
                  <div key={l.rival} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 font-medium"><TendenciaIcon t={l.tendencia} />{l.rival}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">Alerta {l.alerta}% · Crítico {l.critico}%</span>
                        <Badge className={l.statusAtual === 'monitorar' ? 'bg-amber-500' : 'bg-emerald-600'}>
                          {l.statusAtual}
                        </Badge>
                        <span className="font-semibold w-12 text-right">{l.atual}%</span>
                      </div>
                    </div>
                    <Progress value={(l.atual / l.critico) * 100} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {[
            { sev: 'Moderada', cor: 'bg-amber-500', titulo: 'Formalização do apoio de Ratinho Jr. a Sandro Alex',
              desc: 'Sem declaração formal, Sandro já cresceu 2,1 p.p. em um mês. Com apoio explícito, modelos sugerem salto de 4–6 p.p. adicionais, colocando-o próximo de 15–17%.',
              acao: 'Consolidar aliança com lideranças regionais do PSD e PP antes da declaração formal. Criar percepção de que o campo governista já está com Moro.' },
            { sev: 'Moderada', cor: 'bg-amber-500', titulo: 'Gap feminino estrutural',
              desc: 'Diferença de 7,2 p.p. entre homens (46,1%) e mulheres (38,9%). Melhorar 5 p.p. entre mulheres equivale a +2,7 p.p. na média geral — suficiente para cruzar 45%.',
              acao: 'Pautas de segurança, saúde e família. Presença em contextos comunitários e religiosos onde o gap já é menor.' },
            { sev: 'Latente', cor: 'bg-orange-500', titulo: 'Efeito de acomodação do voto',
              desc: '47,9% acham que Moro vai ganhar — maior que a própria intenção (42,3%). Quando o eleitor acha que o resultado está decidido, parte migra para candidatos menores ou fica em casa.',
              acao: 'Comunicação "cada voto conta para garantir o primeiro turno". Ativar o eleitor já decidido.' },
            { sev: 'Controlada', cor: 'bg-emerald-600', titulo: 'Rejeição própria (23,6%)',
              desc: 'Segundo menor do campo, estável entre mai e jun. Risco de elevação em caso de confrontos diretos em debates.',
              acao: 'Postura presidencial, propositiva. Evitar ataques a rivais menores.' },
          ].map((a, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex gap-4">
                <Badge className={`${a.cor} self-start`}>{a.sev}</Badge>
                <div className="flex-1">
                  <div className="font-semibold">{a.titulo}</div>
                  <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
                  <div className="mt-3 p-3 rounded bg-muted text-sm">
                    <span className="font-medium">Ação preventiva: </span>{a.acao}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ============= ABA 3: OPORTUNIDADES ============= */}
        <TabsContent value="oport" className="space-y-4 mt-6">
          {[
            { icon: Heart, titulo: 'Eleitorado feminino — MAIOR OPORTUNIDADE', dado: 'Mulheres 38,9% vs Homens 46,1% — gap de 7,2 p.p. | 52% do eleitorado do PR',
              analise: 'Maior bolsão eleitoral disponível em volume absoluto. Mulheres são 52% do eleitorado paranaense — cada 1 p.p. ganhado nesse grupo equivale a ~0,52 p.p. no total. Concentrar em: (1) Mulheres 35–59 anos com pautas de segurança pública, família e custo de vida; (2) Mulheres jovens com agenda de oportunidades e empreendedorismo; (3) Mães e cuidadoras com educação, saúde e creches. Comunicação por mulheres-referência (lideranças, candidatas proporcionais, vereadoras aliadas) e presença em territórios femininos (igrejas, escolas, mercados, salões).' },
            { icon: Shield, titulo: 'Pautas de Proteção Especial', dado: 'Proteção às crianças, mulheres e idosos',
              analise: 'Um dos principais vetores de aproximação com o eleitorado feminino e familiar. Pautas como combate à violência doméstica, segurança nas escolas, apoio à pessoa idosa e políticas de cuidado geram alta identificação emocional e diferenciação positiva. Devem aparecer de forma recorrente na comunicação, com protagonismo de mulheres da base e alinhamento com lideranças comunitárias, entidades de proteção e conselhos tutelares.' },
            { icon: Church, titulo: 'Eleitorado religioso', dado: 'Praticantes 48,6% vs não-praticantes 35,5% — gap de 13,1 p.p.',
              analise: 'Maior gap segmental. 68% do eleitorado paranaense tem prática religiosa. Espaço de crescimento ainda existente dentro desse grupo.' },
            { icon: GraduationCap, titulo: 'Ensino superior', dado: 'Superior 50,8% vs Fundamental 31,6% — gap de 19,2 p.p.',
              analise: 'Maior penetração atual. Ação é defensiva — proteger esse grupo de narrativas adversárias em debates. 59,6% deles acham que Moro vai ganhar.' },
            { icon: MapPin, titulo: 'Votos de Greca disponíveis', dado: 'Greca caiu 2,4 p.p. — votos em trânsito compatíveis com o perfil de Moro',
              analise: 'Queda concentrada fora de Curitiba. Perfil de eleitor de Greca (conservador moderado, classe média, escolaridade média-alta) é compatível com Moro. Interior prioritário: Cascavel (55,9%), Londrina (47,7%), Maringá (50,3%).' },
            { icon: ArrowRight, titulo: 'Garantir o primeiro turno', dado: '~47% dos votos válidos — faltam ~3 p.p. para 50%+1',
              analise: 'Objetivo mais estratégico. Vencer no primeiro turno elimina qualquer risco de coaligação adversária no segundo. Comunicação de "voto útil" é a ferramenta mais eficiente.' },
          ].map((o, i) => {
            const Icon = o.icon;
            return (
              <Card key={i}>
                <CardContent className="p-4 flex gap-4">
                  <div className="p-3 rounded-md bg-primary/10 self-start"><Icon className="w-6 h-6 text-primary" /></div>
                  <div className="flex-1">
                    <div className="font-semibold">{o.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{o.dado}</div>
                    <p className="text-sm mt-2">{o.analise}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ============= ABA 4: RAIO-X RIVAIS ============= */}
        <TabsContent value="rivais" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Comparativo de vulnerabilidades</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-muted-foreground">
                    <th className="py-2 pr-3">Candidato</th>
                    <th className="py-2 pr-3">Intenção</th>
                    <th className="py-2 pr-3">Tendência</th>
                    <th className="py-2 pr-3">Rejeição</th>
                    <th className="py-2 pr-3">Teto est.</th>
                    <th className="py-2">Vulnerabilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { c: 'Requião Filho', i: '19,9%', t: '→ estável', r: '35,0%', rc: 'text-red-500', teto: '~22%', v: 'Alta rejeição estrutural — teto atingido' },
                    { c: 'Sandro Alex', i: '10,7% ▲', t: '↑ subindo', r: '9,1%', rc: '', teto: '~18–20%', v: 'Crescimento dependente de Ratinho Jr., sem narrativa própria' },
                    { c: 'Rafael Greca', i: '13,9% ▼', t: '↓ caindo', r: '13,2%', rc: '', teto: '~15%', v: 'Queda de narrativa — eleitor migra ao perceber tendência' },
                  ].map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-3 font-medium">{r.c}</td>
                      <td className="py-2 pr-3">{r.i}</td>
                      <td className="py-2 pr-3">{r.t}</td>
                      <td className={`py-2 pr-3 ${r.rc}`}>{r.r}</td>
                      <td className="py-2 pr-3">{r.teto}</td>
                      <td className="py-2">{r.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Requião Filho</CardTitle>
              <Badge className="bg-emerald-600">Contido — teto atingido</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="p-3 rounded border-l-4 border-l-emerald-500 bg-emerald-500/5">Rejeição como barreira natural. 35% não votam nele de forma alguma. Não atacar diretamente para não gerar empatia.</div>
              <div className="p-3 rounded border-l-4 border-l-blue-500 bg-blue-500/5">Explorar rejeição nos segmentos: masculino rejeita em 42,4%; evangélicos em 39,8%. Nesses grupos, basta lembrar quem é Requião.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sandro Alex</CardTitle>
              <Badge className="bg-amber-500">Monitorar — crescendo</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="p-3 rounded border-l-4 border-l-amber-500 bg-amber-500/5">Janela de contenção é agora. Ainda sem narrativa consolidada além do apoio de Ratinho Jr.</div>
              <div className="p-3 rounded border-l-4 border-l-amber-500 bg-amber-500/5">Vulnerabilidade central — dependência do governador. Crescimento derivado, não por mérito próprio.</div>
              <div className="p-3 rounded border-l-4 border-l-blue-500 bg-blue-500/5">Disputa o mesmo eleitor que Moro (conservador, religioso, interior). Ocupar com intensidade antes que Sandro chegue.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rafael Greca</CardTitle>
              <Badge className="bg-emerald-600">Favorável — em queda</Badge>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="p-3 rounded border-l-4 border-l-emerald-500 bg-emerald-500/5">Queda por dinâmica própria — voto de prefeito não migra para governador. Ser o destino natural sem precisar empurrar a queda.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Rejeição comparada</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={REJEICAO} layout="vertical" margin={{ left: 20, right: 40 }}>
                  <XAxis type="number" domain={[0, 40]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="cand" width={120} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="pct" fill="#e34948" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= ABA 5: AÇÕES ============= */}
        <TabsContent value="acoes" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Plano de ação — 90 dias</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-muted-foreground">
                    <th className="py-2 pr-3">Prioridade</th>
                    <th className="py-2 pr-3">Ação</th>
                    <th className="py-2 pr-3">Objetivo</th>
                    <th className="py-2">Segmento-alvo</th>
                  </tr>
                </thead>
                <tbody>
                  {ACOES.map((a, i) => {
                    const cor =
                      a.prioridade === 'urgente' ? 'bg-red-500' :
                      a.prioridade === 'alta' ? 'bg-amber-500' :
                      a.prioridade === 'media' ? 'bg-blue-500' : 'bg-gray-400';
                    return (
                      <tr key={i} className="border-b">
                        <td className="py-2 pr-3"><Badge className={cor}>{a.prioridade}</Badge></td>
                        <td className="py-2 pr-3 font-medium">{a.acao}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{a.objetivo}</td>
                        <td className="py-2">{a.segmento}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <PlanosAcaoCards />

        </TabsContent>
        {/* ============= ABA CRUZAMENTO ============= */}
        <TabsContent value="cruzamento" className="space-y-6 mt-6">
          <CruzamentoPesquisas />
        </TabsContent>

        {/* ============= ABA ANÁLISE IA ============= */}
        <TabsContent value="ia" className="mt-6">
          <AnaliseIAChat
            context={{
              candidato: 'Sérgio Moro',
              cargo: 'Governador do Paraná 2026',
              institutosAtivos,
              pesquisas: PESQUISAS,
              segmentos: SEGMENTOS,
              rejeicao: REJEICAO,
              limiares: LIMIARES,
              acoes: ACOES,
              agregado_ponderado: agregado,
              kpis: {
                intencao_voto: '42,3% (PP jun/26)',
                percepcao_vitoria: '47,9%',
                rejeicao_moro: '23,6%',
                votos_validos_estimados: '~47%',
              },
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// CRUZAMENTO DE PESQUISAS
// ============================================================
function CruzamentoPesquisas() {
  const institutos = useMemo(() => [...new Set(PESQUISAS.map(p => p.inst))], []);
  const candidatos = useMemo(() => [...new Set(PESQUISAS.map(p => p.cand))], []);

  const [selInst, setSelInst] = useState<string[]>(institutos);
  const [selCand, setSelCand] = useState<string[]>(candidatos);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  // Comparativo lado a lado: candidato × instituto
  const matriz = useMemo(() => {
    return selCand.map(cand => {
      const linha: any = { cand };
      let valores: number[] = [];
      selInst.forEach(inst => {
        const r = PESQUISAS.find(p => p.cand === cand && p.inst === inst);
        linha[inst] = r ? r.pct : null;
        if (r) valores.push(r.pct);
      });
      if (valores.length >= 2) {
        linha._min = Math.min(...valores);
        linha._max = Math.max(...valores);
        linha._delta = +(linha._max - linha._min).toFixed(1);
        linha._media = +(valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1);
      }
      return linha;
    });
  }, [selCand, selInst]);

  // Evolução temporal: linha por candidato, X = data ordenada
  const linhaData = useMemo(() => {
    const ordenadas = [...selInst]
      .map(inst => ({ inst, data: PESQUISAS.find(p => p.inst === inst)?.data ?? '' }))
      .sort((a, b) => a.data.localeCompare(b.data));
    return ordenadas.map(({ inst, data }) => {
      const ponto: any = { inst, data: data.slice(5) };
      selCand.forEach(cand => {
        const r = PESQUISAS.find(p => p.cand === cand && p.inst === inst);
        ponto[cand] = r ? r.pct : null;
      });
      return ponto;
    });
  }, [selCand, selInst]);

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Selecione institutos e candidatos para cruzar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Institutos</div>
            <div className="flex flex-wrap gap-3">
              {institutos.map(i => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selInst.includes(i)} onCheckedChange={() => toggle(selInst, i, setSelInst)} />
                  {i}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Candidatos</div>
            <div className="flex flex-wrap gap-3">
              {candidatos.map(c => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selCand.includes(c)} onCheckedChange={() => toggle(selCand, c, setSelCand)} />
                  <span style={{ color: COR_CAND[c] ?? undefined }}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comparativo lado a lado</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-muted-foreground">
                <th className="py-2 pr-3">Candidato</th>
                {selInst.map(i => <th key={i} className="py-2 pr-3 text-right">{i}</th>)}
                <th className="py-2 pr-3 text-right">Média</th>
                <th className="py-2 text-right">Δ (máx-mín)</th>
              </tr>
            </thead>
            <tbody>
              {matriz.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-3 font-medium" style={{ color: COR_CAND[r.cand] ?? undefined }}>{r.cand}</td>
                  {selInst.map(inst => (
                    <td key={inst} className="py-2 pr-3 text-right tabular-nums">
                      {r[inst] != null ? `${r[inst]}%` : '—'}
                    </td>
                  ))}
                  <td className="py-2 pr-3 text-right font-semibold">{r._media != null ? `${r._media}%` : '—'}</td>
                  <td className="py-2 text-right">
                    {r._delta != null ? (
                      <Badge className={r._delta >= 5 ? 'bg-red-500' : r._delta >= 2.5 ? 'bg-amber-500' : 'bg-emerald-600'}>
                        {r._delta} p.p.
                      </Badge>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">
            Δ alto = maior dispersão entre institutos (possível efeito metodológico).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Evolução por instituto (ordem cronológica)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={linhaData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="inst" />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: any) => v != null ? `${v}%` : '—'} />
              <Legend />
              {selCand.map(c => (
                <Line key={c} type="monotone" dataKey={c} stroke={COR_CAND[c] ?? '#9ca3af'} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================
// PLANOS DE AÇÃO — cards detalhados em diálogo
// ============================================================
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PLANOS_DETALHE: Record<string, { titulo: string; subtitulo: string; secoes: { h: string; itens: string[] }[] }> = {
  comunicacao: {
    titulo: 'Plano de comunicação digital — 90 dias',
    subtitulo: 'WhatsApp, Instagram, TikTok e YouTube · foco em conversão de indecisos e gap feminino',
    secoes: [
      { h: 'Mês 1 — Consolidação da marca (semanas 1-4)', itens: [
        'Narrativa central: "Paraná seguro, justo e que cuida das pessoas".',
        'Pílulas semanais (3/semana) com Moro falando de segurança, custo de vida e família.',
        'Operação WhatsApp: 1 áudio + 1 card por dia para grupos das 19 Associações.',
        'Ativação de 60 mulheres-referência (lideranças, candidatas proporcionais) como vozes amplificadoras.',
      ] },
      { h: 'Mês 2 — Diferenciação vs adversários (semanas 5-8)', itens: [
        'Conteúdo comparativo Moro x Requião Filho em segurança e gestão pública.',
        'Série "Cada voto conta no 1º turno" — vídeos de 30s com militantes de cada macrorregião.',
        'Resposta rápida ao crescimento de Sandro Alex: monitoramento de menções + cards de contraste em 24h.',
        'Lives quinzenais com pautas de proteção (mulheres, crianças, idosos).',
      ] },
      { h: 'Mês 3 — Conversão e voto útil (semanas 9-12)', itens: [
        'Operação "1º turno": peças com simulação de cenário (Moro 47% vs 2º turno arriscado).',
        'Push regional: vídeos territorializados por macrorregião com prefeitos e lideranças locais.',
        'Onda final WhatsApp: 2 áudios/dia + corrente de prefeitos aliados.',
        'Métrica-alvo: +3 p.p. entre mulheres 35-59 anos e +2 p.p. entre 16-24 anos.',
      ] },
    ],
  },
  calendario: {
    titulo: 'Calendário de agenda pública',
    subtitulo: 'Priorização por densidade eleitoral, gaps demográficos e janelas regionais',
    secoes: [
      { h: 'Regiões prioritárias (próximas 6 semanas)', itens: [
        'RMC (28 cidades): 2 visitas/semana — foco em segurança e mobilidade.',
        'Curitiba: 1 agenda territorial/semana em bairros com gap feminino (CIC, Tatuquara, Sítio Cercado).',
        'Norte Pioneiro e Norte Central: caravana de 3 dias com candidatos proporcionais.',
        'Oeste (Cascavel, Toledo, Foz): agenda agro + segurança de fronteira.',
        'Sudoeste e Centro-Sul: presença em entidades comunitárias e igrejas.',
      ] },
      { h: 'Tipos de evento recomendados', itens: [
        'Encontros com mulheres-referência (1/semana) — meta: zerar gap feminino até set/26.',
        'Reuniões com lideranças religiosas (não-praticantes têm gap de 13,1 p.p. — equilibrar).',
        'Visitas a escolas técnicas e universidades — alvo 16-24 anos.',
        'Cafés com prefeitos aliados — reforço da rede de coordenação municipal.',
      ] },
      { h: 'Regra de ouro', itens: [
        'Toda agenda pública vira: 1 vídeo nativo + 1 card + 1 áudio para WhatsApp em até 6h.',
        'Registrar no módulo Ações de Campo com geolocalização e impacto estimado.',
      ] },
    ],
  },
  monitoramento: {
    titulo: 'Sistema de monitoramento',
    subtitulo: 'Indicadores semanais para Sala de Guerra e briefing executivo',
    secoes: [
      { h: 'Indicadores principais (semanais)', itens: [
        'Intenção de voto Moro (média móvel 3 institutos).',
        'Tendência Sandro Alex — alerta se ≥13%, crítico se ≥16%.',
        'Gap feminino (atualmente -7,2 p.p.) — meta: reduzir 1 p.p./mês.',
        'Rejeição Moro (monitorar movimento por instituto).',
        'Cobertura territorial: % das 399 cidades com pelo menos 1 ação no mês.',
      ] },
      { h: 'Fontes de dados', itens: [
        'Pesquisas (Neokemp, Veritá, PP, IGR, Atlas) — atualização imediata em /pesquisas/base.',
        'Tracking eleitoral próprio (módulo Tracking) — coletas semanais por entrevistadores.',
        'Ações de campo georreferenciadas (módulo Campo).',
        'Alertas estratégicos gerados por IA na Sala de Crise.',
      ] },
      { h: 'Briefing semanal (toda segunda 8h)', itens: [
        'Resumo de 1 página: variação dos 5 indicadores + 3 alertas + 3 ações sugeridas.',
        'Distribuição: Coordenação Geral, Coordenação Estadual, Coordenadores Macrorregionais.',
        'Reunião de 30min com a Sala de Guerra para definir prioridades da semana.',
      ] },
    ],
  },
  pautas: {
    titulo: 'Pautas e posicionamento',
    subtitulo: 'O que o eleitorado quer ouvir — calibrado pelos dados de segmento e rejeição',
    secoes: [
      { h: 'Pautas vencedoras (alto retorno)', itens: [
        'Segurança pública: combate ao crime organizado, polícia valorizada, fronteiras.',
        'Família e proteção: mulheres, crianças e idosos — pauta com maior identificação emocional.',
        'Custo de vida: ICMS, energia, alimentos — fala direto às mulheres 35-59.',
        'Honestidade e combate à corrupção — marca histórica de Moro, ativo único.',
      ] },
      { h: 'Pautas de equilíbrio (cuidar)', itens: [
        'Saúde pública e SUS — terreno em que Requião Filho tenta avançar.',
        'Educação técnica e empregabilidade jovem — para reduzir gap em 16-24 anos.',
        'Agenda laica (cidadania, direitos) — para não-praticantes religiosos (gap de 13,1 p.p.).',
      ] },
      { h: 'Pautas a evitar / cuidado redobrado', itens: [
        'Polarização nacional pura — desgasta o "voto útil" estadual.',
        'Discussões ideológicas sem entrega prática — alimenta rejeição.',
        'Confronto direto com Ratinho Jr. — risco de afastar eleitor governista neutro.',
      ] },
      { h: 'Tom recomendado', itens: [
        'Firmeza com empatia. Dado + história real. Sempre fechar com proposta concreta.',
        'Protagonismo feminino nas peças (cada 1 p.p. ganho em mulheres = 0,52 p.p. no total).',
      ] },
    ],
  },
};

function PlanosAcaoCards() {
  const [open, setOpen] = useState<string | null>(null);
  const cards: { key: keyof typeof PLANOS_DETALHE; t: string; s: string }[] = [
    { key: 'comunicacao', t: 'Plano de comunicação digital', s: '90 dias · WhatsApp e redes sociais' },
    { key: 'calendario', t: 'Calendário de agenda pública', s: 'Regiões e eventos prioritários' },
    { key: 'monitoramento', t: 'Sistema de monitoramento', s: 'Indicadores e briefing semanal' },
    { key: 'pautas', t: 'Pautas e posicionamento', s: 'O que o eleitorado quer ouvir' },
  ];
  const detalhe = open ? PLANOS_DETALHE[open] : null;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card
            key={c.key}
            onClick={() => setOpen(c.key)}
            className="hover:border-primary cursor-pointer transition-colors"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.t}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.s}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>{detalhe.titulo}</DialogTitle>
                <DialogDescription>{detalhe.subtitulo}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                {detalhe.secoes.map((s, i) => (
                  <div key={i}>
                    <div className="font-semibold text-sm mb-2">{s.h}</div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
                      {s.itens.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
