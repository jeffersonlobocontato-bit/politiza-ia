// src/pages/Eventos.tsx
// Painel interno (autenticado) de gestão de eventos e inscrições.
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Users, CheckCircle2, Clock, MapPin, Link2,
  Copy, ExternalLink, Search, X, Loader2, QrCode, UserCheck,
  TrendingUp, Edit2, Trash2, Eye, EyeOff,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useEventos, useCreateEvento, useUpdateEvento, useDeleteEvento, useUploadEventoBanner,
  useInscricoes, useCheckinInscricao, useDeleteInscricao,
  type Evento, type EventoStatus,
} from '@/hooks/useEventos';
import { TEMA_PRESETS, getPresetById, isValidHex, type TemaPaletaId } from '@/lib/eventoTema';
import { Image as ImageIcon, Palette } from 'lucide-react';

const STATUS_LABELS: Record<EventoStatus, string> = {
  rascunho: 'Rascunho', publicado: 'Publicado', encerrado: 'Encerrado', cancelado: 'Cancelado',
};
const STATUS_COLORS: Record<EventoStatus, string> = {
  rascunho: '#888780', publicado: '#1D9E75', encerrado: '#378ADD', cancelado: '#E24B4A',
};

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const PUBLIC_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

// ─── Lista de Eventos ──────────────────────────────────────────────────────────

function EventosLista({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: eventos = [], isLoading } = useEventos();
  const createEvento = useCreateEvento();
  const updateEvento = useUpdateEvento();
  const deleteEvento = useDeleteEvento();
  const uploadBanner = useUploadEventoBanner();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', data_inicio: '', data_fim: '',
    local_nome: '', endereco: '', municipio: '', is_online: false, link_online: '',
    capacidade_maxima: '' as string | number,
  });
  const [temaPaletaId, setTemaPaletaId] = useState<TemaPaletaId>('mint');
  const [corCustom, setCorCustom] = useState('#2FA85A');
  const [corCustomEscura, setCorCustomEscura] = useState('#1F8444');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleBannerChange = (file: File | null) => {
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : null);
  };

  const corPrimariaAtual = temaPaletaId === 'custom' ? corCustom : (getPresetById(temaPaletaId)?.corPrimaria ?? '#2FA85A');
  const corEscuraAtual = temaPaletaId === 'custom' ? corCustomEscura : (getPresetById(temaPaletaId)?.corPrimariaEscura ?? '#1F8444');

  const handleCreate = async () => {
    if (!form.titulo.trim() || !form.data_inicio) {
      toast.error('Título e data de início são obrigatórios');
      return;
    }
    if (temaPaletaId === 'custom' && (!isValidHex(corCustom) || !isValidHex(corCustomEscura))) {
      toast.error('Informe cores válidas no formato hexadecimal (#RRGGBB)');
      return;
    }
    try {
      const evento = await createEvento.mutateAsync({
        slug: slugify(form.titulo) + '-' + Math.random().toString(36).slice(2, 6),
        titulo: form.titulo,
        descricao: form.descricao || null,
        data_inicio: new Date(form.data_inicio).toISOString(),
        data_fim: form.data_fim ? new Date(form.data_fim).toISOString() : null,
        local_nome: form.local_nome || null,
        endereco: form.endereco || null,
        municipio: form.municipio || null,
        is_online: form.is_online,
        link_online: form.link_online || null,
        capacidade_maxima: form.capacidade_maxima ? Number(form.capacidade_maxima) : null,
        status: 'rascunho',
        tema_paleta_id: temaPaletaId,
        tema_cor_primaria: corPrimariaAtual,
        tema_cor_primaria_escura: corEscuraAtual,
      });

      if (bannerFile) {
        const url = await uploadBanner.mutateAsync({ eventoId: evento.id, file: bannerFile });
        await updateEvento.mutateAsync({ id: evento.id, imagem_capa_url: url });
      }

      toast.success('Evento criado! Publique quando estiver pronto.');
      setShowForm(false);
      setForm({ titulo: '', descricao: '', data_inicio: '', data_fim: '', local_nome: '', endereco: '', municipio: '', is_online: false, link_online: '', capacidade_maxima: '' });
      setTemaPaletaId('mint'); setBannerFile(null); setBannerPreview(null);
      onSelect(evento.id);
    } catch { toast.error('Erro ao criar evento'); }
  };

  const togglePublicar = async (e: Evento) => {
    const novoStatus = e.status === 'publicado' ? 'rascunho' : 'publicado';
    await updateEvento.mutateAsync({ id: e.id, status: novoStatus });
    toast.success(novoStatus === 'publicado' ? 'Evento publicado!' : 'Evento despublicado');
  };

  const copiarLink = (slug: string) => {
    navigator.clipboard.writeText(`${PUBLIC_BASE_URL}/e/${slug}`);
    toast.success('Link copiado!');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-muted-foreground gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Novo evento
        </button>
      </div>

      {showForm && (
        <Card className="p-4 border-primary/40 bg-primary/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Título do evento *</label>
              <input className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Evento Regional PL e Novo" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data/hora de início *</label>
              <input type="datetime-local" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data/hora de término</label>
              <input type="datetime-local" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Local</label>
              <input className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.local_nome} onChange={e => setForm(f => ({ ...f, local_nome: e.target.value }))}
                placeholder="Ex: Sede do PL" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Município</label>
              <input className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Endereço</label>
              <input className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Capacidade máxima (vagas)</label>
              <input type="number" className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.capacidade_maxima} onChange={e => setForm(f => ({ ...f, capacidade_maxima: e.target.value }))}
                placeholder="Deixe vazio = ilimitado" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_online" checked={form.is_online}
                onChange={e => setForm(f => ({ ...f, is_online: e.target.checked }))} className="accent-primary" />
              <label htmlFor="is_online" className="text-xs text-foreground">Evento online</label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <textarea rows={3} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>

            {/* Banner de topo */}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Banner de topo (imagem da página pública)
              </label>
              {bannerPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border h-32">
                  <img src={bannerPreview} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => handleBannerChange(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-20 rounded-lg border border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:bg-accent/40 transition-colors">
                  <ImageIcon className="w-4 h-4" /> Selecionar imagem (opcional — sem imagem usa a cor do tema)
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleBannerChange(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            {/* Tema de cores */}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Palette className="w-3.5 h-3.5" /> Cor do tema (botões, destaques e fundo do banner)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TEMA_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTemaPaletaId(p.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] transition-all ${
                      temaPaletaId === p.id ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: p.gradiente }} />
                    <span className="text-foreground truncate">{p.nome.split(' ')[0]}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTemaPaletaId('custom')}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] transition-all ${
                    temaPaletaId === 'custom' ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-accent/40'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex-shrink-0 border border-border" style={{ background: `linear-gradient(135deg, ${corCustom}, ${corCustomEscura})` }} />
                  <span className="text-foreground">Personalizar</span>
                </button>
              </div>

              {temaPaletaId === 'custom' && (
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={corCustom} onChange={e => setCorCustom(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border" />
                    <span className="text-[10px] text-muted-foreground">Cor principal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={corCustomEscura} onChange={e => setCorCustomEscura(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border" />
                    <span className="text-[10px] text-muted-foreground">Cor secundária (gradiente)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} disabled={createEvento.isPending}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90">
              Criar evento
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhum evento criado ainda.
          </div>
        ) : eventos.map(e => (
          <Card key={e.id} className="p-4 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => onSelect(e.id)}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: STATUS_COLORS[e.status] + '22', color: STATUS_COLORS[e.status] }}>
                {STATUS_LABELS[e.status]}
              </span>
              <button
                onClick={ev => { ev.stopPropagation(); togglePublicar(e); }}
                className="p-1 rounded hover:bg-accent text-muted-foreground"
                title={e.status === 'publicado' ? 'Despublicar' : 'Publicar'}
              >
                {e.status === 'publicado' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 line-clamp-2">{e.titulo}</h3>
            <div className="space-y-1 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{fmtData(e.data_inicio)}</div>
              {e.municipio && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{e.municipio}</div>}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">{e.total_inscritos ?? 0}</span>
                <span className="text-muted-foreground">inscritos</span>
              </div>
              <button onClick={ev => { ev.stopPropagation(); copiarLink(e.slug); }}
                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Copiar link público">
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Detalhe do Evento + Check-in ──────────────────────────────────────────────

function EditarTemaCard({ evento }: { evento: Evento }) {
  const updateEvento = useUpdateEvento();
  const uploadBanner = useUploadEventoBanner();
  const [temaPaletaId, setTemaPaletaId] = useState<TemaPaletaId>((evento.tema_paleta_id as TemaPaletaId) ?? 'mint');
  const [corCustom, setCorCustom] = useState(evento.tema_cor_primaria || '#2FA85A');
  const [corCustomEscura, setCorCustomEscura] = useState(evento.tema_cor_primaria_escura || '#1F8444');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(evento.imagem_capa_url ?? null);
  const [salvando, setSalvando] = useState(false);

  const handleBannerChange = (file: File | null) => {
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : evento.imagem_capa_url ?? null);
  };

  const corPrimariaAtual = temaPaletaId === 'custom' ? corCustom : (getPresetById(temaPaletaId)?.corPrimaria ?? '#2FA85A');
  const corEscuraAtual = temaPaletaId === 'custom' ? corCustomEscura : (getPresetById(temaPaletaId)?.corPrimariaEscura ?? '#1F8444');

  const handleSalvar = async () => {
    if (temaPaletaId === 'custom' && (!isValidHex(corCustom) || !isValidHex(corCustomEscura))) {
      toast.error('Informe cores válidas no formato hexadecimal (#RRGGBB)');
      return;
    }
    setSalvando(true);
    try {
      let imagemUrl = evento.imagem_capa_url;
      if (bannerFile) {
        imagemUrl = await uploadBanner.mutateAsync({ eventoId: evento.id, file: bannerFile });
      }
      await updateEvento.mutateAsync({
        id: evento.id,
        tema_paleta_id: temaPaletaId,
        tema_cor_primaria: corPrimariaAtual,
        tema_cor_primaria_escura: corEscuraAtual,
        imagem_capa_url: imagemUrl,
      });
      toast.success('Tema atualizado!');
      setBannerFile(null);
    } catch { toast.error('Erro ao salvar tema'); }
    setSalvando(false);
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5" /> Banner e cor do tema
      </h3>

      <div className="mb-4">
        {bannerPreview ? (
          <div className="relative rounded-lg overflow-hidden border border-border h-36">
            <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
            <label className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-[11px] cursor-pointer hover:bg-black/80">
              Trocar imagem
              <input type="file" accept="image/*" className="hidden" onChange={e => handleBannerChange(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 h-24 rounded-lg border border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:bg-accent/40 transition-colors">
            <ImageIcon className="w-4 h-4" /> Selecionar imagem de banner
            <input type="file" accept="image/*" className="hidden" onChange={e => handleBannerChange(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
        {TEMA_PRESETS.map(p => (
          <button key={p.id} type="button" onClick={() => setTemaPaletaId(p.id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] transition-all ${
              temaPaletaId === p.id ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-accent/40'
            }`}>
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: p.gradiente }} />
            <span className="text-foreground truncate">{p.nome.split(' ')[0]}</span>
          </button>
        ))}
        <button type="button" onClick={() => setTemaPaletaId('custom')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] transition-all ${
            temaPaletaId === 'custom' ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-accent/40'
          }`}>
          <span className="w-4 h-4 rounded-full flex-shrink-0 border border-border" style={{ background: `linear-gradient(135deg, ${corCustom}, ${corCustomEscura})` }} />
          <span className="text-foreground">Personalizar</span>
        </button>
      </div>

      {temaPaletaId === 'custom' && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <input type="color" value={corCustom} onChange={e => setCorCustom(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
            <span className="text-[10px] text-muted-foreground">Cor principal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="color" value={corCustomEscura} onChange={e => setCorCustomEscura(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
            <span className="text-[10px] text-muted-foreground">Cor secundária</span>
          </div>
        </div>
      )}

      <button onClick={handleSalvar} disabled={salvando}
        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90">
        {salvando ? 'Salvando…' : 'Salvar tema'}
      </button>
    </Card>
  );
}

function EventoDetalhe({ eventoId, onBack }: { eventoId: string; onBack: () => void }) {
  const { data: eventos = [] } = useEventos();
  const evento = eventos.find(e => e.id === eventoId);
  const { data: inscricoes = [], isLoading } = useInscricoes(eventoId);
  const checkin = useCheckinInscricao();
  const deleteInscricao = useDeleteInscricao();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => inscricoes.filter(i =>
    !search ||
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    (i.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    i.telefone.toLowerCase().includes(search.toLowerCase()) ||
    i.codigo_confirmacao.toLowerCase().includes(search.toLowerCase())
  ), [inscricoes, search]);

  const totalPresentes = inscricoes.filter(i => i.status === 'presente').length;

  if (!evento) return null;

  const linkPublico = `${PUBLIC_BASE_URL}/e/${evento.slug}`;

  const copiarLink = () => { navigator.clipboard.writeText(linkPublico); toast.success('Link copiado!'); };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
        ← Voltar para eventos
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{evento.titulo}</h2>
          <p className="text-xs text-muted-foreground mt-1">{fmtDataHora(evento.data_inicio)} {evento.municipio ? `· ${evento.municipio}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copiarLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs hover:bg-accent">
            <Copy className="w-3.5 h-3.5" /> Copiar link público
          </button>
          <a href={linkPublico} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs hover:bg-accent">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir
          </a>
        </div>
      </div>

      <EditarTemaCard evento={evento} />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Users className="w-4 h-4 text-primary mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">{inscricoes.length}</div>
          <div className="text-[10px] text-muted-foreground">inscritos</div>
        </Card>
        <Card className="p-4 text-center">
          <UserCheck className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">{totalPresentes}</div>
          <div className="text-[10px] text-muted-foreground">check-in feito</div>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">
            {inscricoes.length > 0 ? Math.round((totalPresentes / inscricoes.length) * 100) : 0}%
          </div>
          <div className="text-[10px] text-muted-foreground">taxa de presença</div>
        </Card>
      </div>

      {/* Busca + lista */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Buscar por nome, e-mail ou código…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Nome', 'Contato', 'Município', 'Código', 'Presença', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma inscrição encontrada.</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className="border-b border-border/50 hover:bg-muted/10">
                  <td className="px-3 py-2.5 font-medium text-foreground">{i.nome}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{i.telefone}{i.email ? <><br />{i.email}</> : null}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{i.municipio}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{i.codigo_confirmacao.toUpperCase()}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => checkin.mutate({ id: i.id, presente: i.status !== 'presente' })}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                        i.status === 'presente'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" /> {i.status === 'presente' ? 'Presente' : 'Marcar presença'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => deleteInscricao.mutate(i.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Eventos() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Eventos & Inscrições</h1>
          <p className="text-xs text-muted-foreground">Crie páginas públicas de inscrição e gerencie check-in de presença</p>
        </div>
      </div>

      {selectedId
        ? <EventoDetalhe eventoId={selectedId} onBack={() => setSelectedId(null)} />
        : <EventosLista onSelect={setSelectedId} />}
    </div>
  );
}
