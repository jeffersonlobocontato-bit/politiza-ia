// src/lib/eventoTema.ts
// Sistema de tema editável por evento — usa os tokens do design system
// "Campo Mobile" (mint/blue/amber/red) como paletas pré-definidas,
// mais a opção de cor livre.

export interface EventoTema {
  paletaId: TemaPaletaId;      // qual paleta pré-definida (ou 'custom')
  corPrimaria: string;          // hex — usada em CTA, destaques, ícones
  corPrimariaEscura: string;    // hex — segunda cor do gradiente do CTA
  corOverlay: string;           // hex com alpha — overlay sobre o banner
}

export type TemaPaletaId = 'mint' | 'blue' | 'amber' | 'red' | 'custom';

export interface PaletaPreset {
  id: TemaPaletaId;
  nome: string;
  corPrimaria: string;
  corPrimariaEscura: string;
  glow: string;
  gradiente: string; // preview do gradiente, mesmo padrão usado nos CTAs do Campo Mobile
}

// Paletas extraídas diretamente de src/styles/campo-mobile.css
// (--campo-mint, --campo-blue, --campo-amber, --campo-red)
export const TEMA_PRESETS: PaletaPreset[] = [
  {
    id: 'mint',
    nome: 'Verde Campanha (padrão)',
    corPrimaria: '#2FA85A',
    corPrimariaEscura: '#1F8444',
    glow: '#5BE0A0',
    gradiente: 'linear-gradient(135deg, #2FA85A 0%, #1F8444 100%)',
  },
  {
    id: 'blue',
    nome: 'Azul Institucional',
    corPrimaria: '#2B6FD4',
    corPrimariaEscura: '#1F4FA0',
    glow: '#6FA0F0',
    gradiente: 'linear-gradient(135deg, #2B6FD4 0%, #1F4FA0 100%)',
  },
  {
    id: 'amber',
    nome: 'Âmbar / Alerta',
    corPrimaria: '#F0B048',
    corPrimariaEscura: '#C5851F',
    glow: '#FFD27A',
    gradiente: 'linear-gradient(135deg, #F0B048 0%, #C5851F 100%)',
  },
  {
    id: 'red',
    nome: 'Vermelho Urgência',
    corPrimaria: '#E85D3A',
    corPrimariaEscura: '#B8401F',
    glow: '#FF8A66',
    gradiente: 'linear-gradient(135deg, #E85D3A 0%, #B8401F 100%)',
  },
];

export const TEMA_PADRAO: EventoTema = {
  paletaId: 'mint',
  corPrimaria: '#2FA85A',
  corPrimariaEscura: '#1F8444',
  corOverlay: 'rgba(10, 15, 31, 0.55)',
};

export function getPresetById(id: TemaPaletaId): PaletaPreset | undefined {
  return TEMA_PRESETS.find(p => p.id === id);
}

// Converte hex em rgba com alpha customizado — usado para o overlay do banner
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Gera as variáveis CSS inline para aplicar o tema no componente público
export function temaToCssVars(tema: EventoTema): React.CSSProperties {
  return {
    '--evento-primaria': tema.corPrimaria,
    '--evento-primaria-escura': tema.corPrimariaEscura,
    '--evento-gradiente': `linear-gradient(135deg, ${tema.corPrimaria} 0%, ${tema.corPrimariaEscura} 100%)`,
    '--evento-overlay': tema.corOverlay,
    '--evento-shadow': `0 8px 22px -10px ${hexToRgba(tema.corPrimaria, 0.55)}`,
  } as React.CSSProperties;
}

// Valida se uma string é um hex válido (#RGB ou #RRGGBB)
export function isValidHex(v: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v);
}
