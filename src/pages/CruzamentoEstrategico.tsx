import { useMemo, useState } from 'react';
import { Crosshair, Loader2, Search, MapPin, Target } from 'lucide-react';
import {
  useChapaCandidatos,
  useDiagnosticoChapa,
  CENARIO_LABEL,
  type CenarioChapa,
} from '@/hooks/useCruzamentoEleitoral';

const fmt = (n: number) => n.toLocaleString('pt-BR');

export default function CruzamentoEstrategico() {
  const { data: candidatos = [], isLoading: loadingCand } = useChapaCandidatos();
  const [slateId, setSlateId] = useState<string>('');
  const [cenario, setCenario] = useState<CenarioChapa>('medio');
  const [buscaCandidato, setBuscaCandidato] = useState('');
  const [buscaCidade, setBuscaCidade] = useState('');
  const [ordenacao, setOrdenacao] = useState<'espaco' | 'proprios'>('espaco');

  const { data: diagnostico = [], isLoading: loadingDiag } = useDiagnosticoChapa(slateId || null, cenario);

  const candidatosFiltrados = useMemo(() => {
    const q = buscaCandidato.trim().toLowerCase();
    if (!q) return candidatos;
    return candidatos.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.party ?? '').toLowerCase().includes(q) ||
        (c.cargo ?? '').toLowerCase().includes(q),
    );
  }, [candidatos, buscaCandidato]);

  const selecionado = candidatos.find(c => c.id === slateId) ?? null;
  const meta = diagnostico[0]?.meta ?? 0;

  const cidadesNecessarias = useMemo(() => {
    if (!meta) return 0;
    const idx = diagnostico.findIndex(d => d.pctMetaCoberta >= 100);
    return idx === -1 ? diagnostico.length : idx + 1;
  }, [diagnostico, meta]);

  const cidadesBasePropria = useMemo(
    () => diagnostico.filter(d => d.basePropria).length,
    [diagnostico],
  );

  const votosProprios = useMemo(
    () => diagnostico.reduce((acc, d) => acc + d.votosProprios, 0),
    [diagnostico],
  );

  const lista = useMemo(() => {
    const rankPos = new Map(diagnostico.map((d, i) => [d.municipio, i + 1]));
    let arr = diagnostico.map(d => ({ ...d, rank: rankPos.get(d.municipio) ?? 0 }));
    const q = buscaCidade.trim().toLowerCase();
    if (q) arr = arr.filter(d => d.municipio.toLowerCase().includes(q));
    if (ordenacao === 'proprios') {
      arr = [...arr].sort((a, b) => b.votosProprios - a.votosProprios || b.espacoDisponivel - a.espacoDisponivel);
    }
    return arr;
  }, [diagnostico, buscaCidade, ordenacao]);

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Crosshair className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Cruzamento Estratégico</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Cruza o histórico eleitoral de 2022 com os pré-candidatos de 2026 que já concorreram, para estimar
            quanto voto ainda está livre em cada cidade — e quantas cidades bastam para cobrir a meta do cenário.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-3">
        <div className="min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Buscar</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground"
              placeholder="Nome, partido ou cargo"
              value={buscaCandidato}
              onChange={e => setBuscaCandidato(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 min-w-[280px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Pré-candidato {candidatos.length > 0 && <span className="normal-case">({candidatosFiltrados.length})</span>}
          </label>
          <select
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={slateId}
            onChange={e => setSlateId(e.target.value)}
          >
            <option value="">Selecione um pré-candidato...</option>
            {candidatosFiltrados.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.party} · {c.cargo}){c.city ? ` — ${c.city}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cenário</label>
          <div className="flex gap-1">
            {(['ruim', 'medio', 'bom'] as CenarioChapa[]).map(c => (
              <button
                key={c}
                onClick={() => setCenario(c)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
                  cenario === c
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {CENARIO_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingCand && (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando pré-candidatos...
        </div>
      )}

      {!loadingCand && !slateId && (
        <div className="text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl py-14">
          Selecione um pré-candidato para ver o diagnóstico.
        </div>
      )}

      {slateId && loadingDiag && (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculando espaço disponível...
        </div>
      )}

      {slateId && !loadingDiag && diagnostico.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Meta — cenário {CENARIO_LABEL[cenario]}
              </p>
              <p className="text-2xl font-bold text-primary">{fmt(meta)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{selecionado?.cargo}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cidades para cobrir a meta
              </p>
              <p className="text-2xl font-bold text-foreground">{meta ? cidadesNecessarias : '—'}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {meta ? 'priorizadas por espaço livre' : 'meta não cadastrada na chapa'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cidades com base própria</p>
              <p className="text-2xl font-bold text-foreground">{cidadesBasePropria}</p>
              <p className="text-[11px] text-muted-foreground mt-1">histórico de 2022</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Votos próprios em 2022</p>
              <p className="text-2xl font-bold text-foreground">{fmt(votosProprios)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {cidadesBasePropria === 0 ? 'sem histórico no cargo' : 'somados no estado'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-3">
            <div className="min-w-[200px] flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Buscar cidade
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground"
                  placeholder="Nome do município"
                  value={buscaCidade}
                  onChange={e => setBuscaCidade(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ordenar por</label>
              <select
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
                value={ordenacao}
                onChange={e => setOrdenacao(e.target.value as 'espaco' | 'proprios')}
              >
                <option value="espaco">Espaço disponível</option>
                <option value="proprios">Votos próprios em 2022</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {lista.map(d => {
              const dentroDoCorte = meta > 0 && d.rank <= cidadesNecessarias;
              return (
                <div
                  key={d.municipio}
                  className={`bg-card border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                    dentroDoCorte ? 'border-primary/60' : 'border-border'
                  } ${d.basePropria ? 'border-l-4 border-l-accent' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {d.rank}. {d.municipio}
                      </span>
                      {d.basePropria && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-accent-foreground bg-accent rounded px-1.5 py-0.5">
                          Base própria · {fmt(d.votosProprios)} votos em 2022
                        </span>
                      )}
                      {dentroDoCorte && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary border border-primary/40 rounded px-1.5 py-0.5">
                          Prioritária
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {d.pctEspacoDisponivel}% do voto do cargo está livre nesta cidade
                      {meta > 0 && (
                        <>
                          <Target className="w-3 h-3 ml-2" />
                          {d.pctMetaCoberta}% da meta acumulada até aqui
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-primary">{fmt(d.espacoDisponivel)}</p>
                    <p className="text-[10.5px] text-muted-foreground">espaço disponível</p>
                  </div>
                </div>
              );
            })}
            {lista.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cidade encontrada.</p>
            )}
          </div>
        </>
      )}

      {slateId && !loadingDiag && diagnostico.length === 0 && (
        <div className="text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl py-14">
          Sem dados de 2022 para o cargo deste pré-candidato.
        </div>
      )}
    </div>
  );
}
