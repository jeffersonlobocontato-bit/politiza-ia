// src/pages/EventoPublico.tsx
// Página PÚBLICA de inscrição — não requer login.
// Rota sugerida: /e/:slug
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar, MapPin, Clock, Users, CheckCircle2, Loader2,
  AlertCircle, Share2, Copy, ExternalLink, Video,
} from 'lucide-react';
import { useEventoPublico, useCreateInscricaoPublica } from '@/hooks/useEventos';
import { temaToCssVars, type EventoTema } from '@/lib/eventoTema';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDataLonga(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Loading / Error states ────────────────────────────────────────────────────

function CenterState({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--campo-grad-bg)' }}>
      {children}
    </div>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

function InscricaoForm({ eventoId, camposExtra, onSuccess }: {
  eventoId: string;
  camposExtra: { id: string; label: string; tipo: 'texto' | 'select'; opcoes?: string[]; obrigatorio?: boolean }[];
  onSuccess: (codigo: string, nome: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [cargoInteresse, setCargoInteresse] = useState('');
  const [partido, setPartido] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createInscricao = useCreateInscricaoPublica();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Informe seu nome completo';
    if (!municipio.trim()) e.municipio = 'Informe sua cidade';
    if (!telefone.trim() || telefone.replace(/\D/g, '').length < 10) e.telefone = 'Informe um número de celular válido';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'E-mail inválido';
    camposExtra.forEach(c => {
      if (c.obrigatorio && !extras[c.id]?.trim()) e[`extra_${c.id}`] = 'Campo obrigatório';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      const result = await createInscricao.mutateAsync({
        evento_id: eventoId,
        nome: nome.trim(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        telefone: telefone.trim(),
        municipio: municipio.trim(),
        cargo_interesse: cargoInteresse || undefined,
        partido: partido || undefined,
        observacoes: observacoes || undefined,
        respostas_extra: extras,
      });
      onSuccess(result.codigo_confirmacao, result.nome);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao realizar inscrição. Tente novamente.');
    }
  };

  const inputCls = "w-full bg-[var(--campo-surface)] border border-[var(--campo-line)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--campo-text-faint)] focus:outline-none focus:border-[var(--evento-primaria)] transition-colors";
  const labelCls = "text-xs font-medium text-[var(--campo-text-soft)] mb-1.5 block";
  const errorCls = "text-[11px] text-[var(--campo-red)] mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Nome completo *</label>
        <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
        {errors.nome && <p className={errorCls}>{errors.nome}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Cidade *</label>
          <input className={inputCls} value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Sua cidade" />
          {errors.municipio && <p className={errorCls}>{errors.municipio}</p>}
        </div>
        <div>
          <label className={labelCls}>Celular (WhatsApp) *</label>
          <input className={inputCls} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(41) 99999-0000" />
          {errors.telefone && <p className={errorCls}>{errors.telefone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>E-mail</label>
          <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com (opcional)" />
          {errors.email && <p className={errorCls}>{errors.email}</p>}
        </div>
        <div>
          <label className={labelCls}>Partido de referência</label>
          <select className={inputCls} value={partido} onChange={e => setPartido(e.target.value)}>
            <option value="">Selecione (opcional)</option>
            <option value="PL">PL</option>
            <option value="Novo">Novo</option>
            <option value="outro">Outro</option>
            <option value="indiferente">Sem partido / Indiferente</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Cargo / Função de interesse</label>
        <input className={inputCls} value={cargoInteresse} onChange={e => setCargoInteresse(e.target.value)}
          placeholder="Ex: Coordenador regional, liderança local, apoiador..." />
      </div>

      {camposExtra.map(campo => (
        <div key={campo.id}>
          <label className={labelCls}>{campo.label}{campo.obrigatorio ? ' *' : ''}</label>
          {campo.tipo === 'select' ? (
            <select className={inputCls} value={extras[campo.id] ?? ''}
              onChange={e => setExtras(prev => ({ ...prev, [campo.id]: e.target.value }))}>
              <option value="">Selecione</option>
              {(campo.opcoes ?? []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input className={inputCls} value={extras[campo.id] ?? ''}
              onChange={e => setExtras(prev => ({ ...prev, [campo.id]: e.target.value }))} />
          )}
          {errors[`extra_${campo.id}`] && <p className={errorCls}>{errors[`extra_${campo.id}`]}</p>}
        </div>
      ))}

      <div>
        <label className={labelCls}>Observações</label>
        <textarea className={inputCls + ' resize-none'} rows={3} value={observacoes}
          onChange={e => setObservacoes(e.target.value)} placeholder="Algo que devemos saber?" />
      </div>

      <button
        type="submit"
        disabled={createInscricao.isPending}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-all"
        style={{ background: 'var(--evento-gradiente)', boxShadow: 'var(--evento-shadow)' }}
      >
        {createInscricao.isPending ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Enviando inscrição…</span>
        ) : 'Confirmar inscrição'}
      </button>

      <p className="text-[11px] text-[var(--campo-text-faint)] text-center">
        Seus dados serão usados apenas para organização deste evento.
      </p>
    </form>
  );
}

// ─── Success state ──────────────────────────────────────────────────────────

function SucessoInscricao({ codigo, nome, evento }: { codigo: string; nome: string; evento: any }) {
  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado!');
  };

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'rgba(47, 168, 90, 0.15)' }}>
        <CheckCircle2 className="w-9 h-9" style={{ color: 'var(--evento-primaria)' }} />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Inscrição confirmada!</h2>
      <p className="text-sm text-[var(--campo-text-soft)] mb-6">
        {nome.split(' ')[0]}, sua presença em <strong className="text-white">{evento.titulo}</strong> está garantida.
      </p>

      <div className="bg-[var(--campo-surface)] border border-[var(--campo-line)] rounded-xl p-4 mb-6">
        <p className="text-[10px] uppercase tracking-wider text-[var(--campo-text-mute)] mb-1.5">Seu código de confirmação</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-mono font-bold tracking-wider" style={{ color: 'var(--evento-primaria)' }}>
            {codigo.toUpperCase()}
          </span>
          <button onClick={copiarCodigo} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Copy className="w-4 h-4 text-[var(--campo-text-soft)]" />
          </button>
        </div>
        <p className="text-[11px] text-[var(--campo-text-faint)] mt-2">Apresente este código na entrada do evento</p>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--campo-text-soft)]">
        <Calendar className="w-3.5 h-3.5" />
        {fmtDataLonga(evento.data_inicio)} às {fmtHora(evento.data_inicio)}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const { data: evento, isLoading, isError } = useEventoPublico(slug ?? null);
  const [inscrito, setInscrito] = useState<{ codigo: string; nome: string } | null>(null);

  if (isLoading) {
    return (
      <CenterState>
        <div className="flex items-center gap-2 text-[var(--campo-text-soft)]">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando evento…
        </div>
      </CenterState>
    );
  }

  if (isError || !evento) {
    return (
      <CenterState>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-[var(--campo-red)] mx-auto mb-3" />
          <h1 className="text-lg font-bold text-white mb-1">Evento não encontrado</h1>
          <p className="text-sm text-[var(--campo-text-soft)]">
            Este evento pode ter sido encerrado, removido, ou o link está incorreto.
          </p>
        </div>
      </CenterState>
    );
  }

  const lotado = evento.capacidade_maxima != null && (evento.total_inscritos ?? 0) >= evento.capacidade_maxima;
  const vagasRestantes = evento.capacidade_maxima != null ? evento.capacidade_maxima - (evento.total_inscritos ?? 0) : null;

  const tema: EventoTema = {
    paletaId: (evento.tema_paleta_id as any) ?? 'mint',
    corPrimaria: evento.tema_cor_primaria || '#2FA85A',
    corPrimariaEscura: evento.tema_cor_primaria_escura || '#1F8444',
    corOverlay: evento.tema_cor_overlay || 'rgba(10, 15, 31, 0.55)',
  };
  const temaVars = temaToCssVars(tema);

  const bannerAspect = (evento.banner_aspect_ratio || '16/9').replace('/', ' / ');
  const bannerPosX = evento.banner_position_x ?? 50;
  const bannerPosY = evento.banner_position_y ?? 50;
  const bannerZoom = evento.banner_zoom ?? 1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--campo-grad-bg)', ...temaVars }}>
      {/* Banner de topo */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: bannerAspect }}>
        {evento.imagem_capa_url ? (
          <>
            <img
              src={evento.imagem_capa_url}
              alt={evento.titulo}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${bannerPosX}% ${bannerPosY}%`,
                transform: `scale(${bannerZoom})`,
                transformOrigin: `${bannerPosX}% ${bannerPosY}%`,
              }}
            />
            <div className="absolute inset-0" style={{ background: 'var(--evento-overlay)' }} />
          </>
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--evento-gradiente)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--campo-bg-deep)] via-transparent to-transparent" />
      </div>


      <div className="max-w-2xl mx-auto px-4 -mt-12 relative pb-16">
        {/* Card principal */}
        <div className="bg-[var(--campo-surface)] border border-[var(--campo-line-strong)] rounded-2xl p-5 sm:p-7 shadow-2xl">
          {!inscrito && (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 leading-tight">{evento.titulo}</h1>

              {/* Info rápida */}
              <div className="space-y-2.5 mb-6">
                <div className="flex items-center gap-2.5 text-sm text-[var(--campo-text-soft)]">
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--evento-primaria)' }} />
                  <span className="capitalize">{fmtDataLonga(evento.data_inicio)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-[var(--campo-text-soft)]">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--evento-primaria)' }} />
                  <span>
                    {fmtHora(evento.data_inicio)}
                    {evento.data_fim ? ` às ${fmtHora(evento.data_fim)}` : ''}
                  </span>
                </div>
                {evento.is_online ? (
                  <div className="flex items-center gap-2.5 text-sm text-[var(--campo-text-soft)]">
                    <Video className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--evento-primaria)' }} />
                    <span>Evento online</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-sm text-[var(--campo-text-soft)]">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--evento-primaria)' }} />
                    <span>
                      {evento.local_nome && <strong className="text-white">{evento.local_nome}</strong>}
                      {evento.local_nome && (evento.endereco || evento.municipio) && <br />}
                      {evento.endereco}{evento.endereco && evento.municipio ? ', ' : ''}{evento.municipio}
                    </span>
                  </div>
                )}
                {evento.capacidade_maxima != null && (
                  <div className="flex items-center gap-2.5 text-sm text-[var(--campo-text-soft)]">
                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--evento-primaria)' }} />
                    <span>
                      {lotado ? 'Vagas esgotadas' : `${vagasRestantes} ${vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
                    </span>
                  </div>
                )}
              </div>

              {evento.descricao && (
                <p className="text-sm text-[var(--campo-text-soft)] leading-relaxed mb-6 whitespace-pre-line">
                  {evento.descricao}
                </p>
              )}

              <div className="h-px bg-[var(--campo-line)] mb-6" />

              {lotado ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 text-[var(--campo-amber)] mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">As vagas para este evento se esgotaram.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-white mb-4">Faça sua inscrição</h2>
                  <InscricaoForm
                    eventoId={evento.id}
                    camposExtra={evento.campos_extra ?? []}
                    onSuccess={(codigo, nome) => setInscrito({ codigo, nome })}
                  />
                </>
              )}
            </>
          )}

          {inscrito && <SucessoInscricao codigo={inscrito.codigo} nome={inscrito.nome} evento={evento} />}
        </div>

        <p className="text-center text-[11px] text-[var(--campo-text-faint)] mt-6">
          Campanha Sergio Moro · Paraná 2026
        </p>
      </div>
    </div>
  );
}
