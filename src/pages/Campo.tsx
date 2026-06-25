import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Users, ClipboardCheck, ShieldAlert, ArrowRight, Camera, Loader2, User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidate } from '@/contexts/CandidateContext';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_AREA_LABELS } from '@/types/database';
import { useMyCampaignMembership } from '@/hooks/useMyCampaignMembership';
import { toast } from 'sonner';

const tools = [
  {
    to: '/campo/liderancas',
    icon: Users,
    title: 'CADASTRAR LIDERANÇA',
    desc: 'Mapeie e qualifique lideranças por cidade, bairro e segmento.',
    accent: '#2FA85A',
  },
  {
    to: '/campo/acao',
    icon: ClipboardCheck,
    title: 'REGISTRAR AÇÕES',
    desc: 'Registre execuções de campo com fotos e geolocalização.',
    accent: '#1F5AB4',
  },
  {
    to: '/campo/fiscalize',
    icon: ShieldAlert,
    title: 'FISCALIZE',
    desc: 'Reporte ao jurídico possíveis crimes eleitorais e irregularidades.',
    accent: '#E85D3A',
  },
] as const;

function useAvatarUrl(rawValue: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!rawValue) { setUrl(null); return; }
    // Direct URL: use as-is
    if (rawValue.startsWith('http')) { setUrl(rawValue); return; }
    // Storage path → signed URL
    (async () => {
      const { data } = await supabase.storage.from('user-avatars').createSignedUrl(rawValue, 60 * 60 * 24 * 7);
      if (active) setUrl(data?.signedUrl ?? null);
    })();
    return () => { active = false; };
  }, [rawValue]);
  return url;
}

export default function Campo() {
  const { user, profile, roles } = useAuth();
  const { activeCandidate } = useCandidate();
  const [uploading, setUploading] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(profile?.avatar_url ?? null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setAvatarPath(profile?.avatar_url ?? null); }, [profile?.avatar_url]);

  const avatarUrl = useAvatarUrl(avatarPath);

  const handleAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await (supabase as any).from('profiles').update({ avatar_url: path }).eq('id', user.id);
      if (updErr) throw updErr;
      setAvatarPath(path);
      toast.success('Foto de perfil atualizada');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const candidateName = activeCandidate?.name ?? 'Sergio Moro';
  const candidatePhoto = activeCandidate?.photo_url ?? 'https://sumdjlmjtqgfzkcfkceq.supabase.co/storage/v1/object/public/candidate-photos/sergio-moro.jpg';
  const candidateSubtitle = 'PRÉ-CANDIDATO AO GOVERNO';

  const displayName = profile?.full_name?.trim() || user?.email || 'Operador de Campo';
  const initials = displayName.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const { data: membership } = useMyCampaignMembership();
  const functionLabel = membership?.role?.trim() || 'Integrante';
  const areaLabel = roles[0] ? ROLE_AREA_LABELS[roles[0]] : 'Equipe de Campo';
  const levelTag = membership?.hierarchy_level ? `Nível ${membership.hierarchy_level}` : null;

  return (
    <div className="min-h-full mn-font" style={{ background: 'linear-gradient(180deg,#0F1B2E 0%,#1A2A45 60%,#0F1B2E 100%)' }}>
      <div className="px-5 pt-6 pb-10 max-w-md mx-auto space-y-5">

        {/* Candidate hero card */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(31,90,180,0.35) 0%, rgba(26,42,69,0.95) 100%)',
            border: '1px solid rgba(91,224,160,0.18)',
            boxShadow: '0 12px 36px -12px rgba(31,90,180,0.45)',
          }}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(47,168,90,0.25), transparent 70%)' }} />
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2" style={{ borderColor: '#2FA85A' }}>
            <img src={candidatePhoto} alt={candidateName} className="w-full h-full object-cover" />
          </div>
          <div className="relative min-w-0">
            <h1 className="text-xl font-extrabold leading-tight text-white truncate">{candidateName}</h1>
            <div className="text-[12px] mt-0.5 font-semibold tracking-wide" style={{ color: '#2FA85A' }}>{candidateSubtitle}</div>
          </div>
        </div>

        {/* User card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 group"
            style={{ background: '#243554', border: '2px solid rgba(91,224,160,0.5)' }}
            aria-label="Trocar foto de perfil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                {initials || <UserIcon className="w-5 h-5" />}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleAvatar(f); e.target.value = ''; }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{displayName}</div>
            <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#5BE0A0' }}>
              {roleLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(91,224,160,0.4)', color: '#5BE0A0' }}
          >
            {uploading ? '...' : 'Foto'}
          </button>
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-1">
          {tools.map(t => (
            <Link
              key={t.to}
              to={t.to}
              className="group relative block rounded-2xl p-5 overflow-hidden transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(36,53,84,0.95) 0%, rgba(26,42,69,0.95) 100%)',
                border: `1px solid ${t.accent}40`,
                boxShadow: `0 8px 24px -10px ${t.accent}55`,
              }}
            >
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${t.accent}, transparent 70%)` }} />
              <div className="relative flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${t.accent}20`, border: `1px solid ${t.accent}60` }}
                >
                  <t.icon className="w-6 h-6" style={{ color: t.accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold tracking-wide text-white">{t.title}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{t.desc}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
