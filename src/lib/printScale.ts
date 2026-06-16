// Tamanhos de papel (mm) e escalas de pin para o modo de impressão do Mapa Estratégico.

export type PaperFormat = 'A4' | 'A3' | 'A2';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PaperSpec {
  format: PaperFormat;
  orientation: PaperOrientation;
  widthMm: number;
  heightMm: number;
  /** Range base do pin em pixels CSS (será modulado por densidade). */
  pinMinPx: number;
  pinMaxPx: number;
  /** Tamanho da fonte das labels de cidade em px CSS. */
  cityLabelPx: number;
  /** Big numbers no rodapé em pt. */
  bigNumberPt: number;
}

const BASE: Record<PaperFormat, { w: number; h: number; pinMin: number; pinMax: number; label: number; big: number }> = {
  A4: { w: 210, h: 297, pinMin: 6, pinMax: 14, label: 6, big: 18 },
  A3: { w: 297, h: 420, pinMin: 8, pinMax: 18, label: 7, big: 22 },
  A2: { w: 420, h: 594, pinMin: 10, pinMax: 24, label: 8, big: 26 },
};

export function buildPaperSpec(format: PaperFormat, orientation: PaperOrientation): PaperSpec {
  const b = BASE[format];
  const portrait = orientation === 'portrait';
  return {
    format,
    orientation,
    widthMm: portrait ? b.w : b.h,
    heightMm: portrait ? b.h : b.w,
    pinMinPx: b.pinMin,
    pinMaxPx: b.pinMax,
    cityLabelPx: b.label,
    bigNumberPt: b.big,
  };
}

export const PAPER_OPTIONS: Array<{ format: PaperFormat; orientation: PaperOrientation; label: string }> = [
  { format: 'A4', orientation: 'landscape', label: 'A4 paisagem' },
  { format: 'A4', orientation: 'portrait', label: 'A4 retrato' },
  { format: 'A3', orientation: 'landscape', label: 'A3 paisagem' },
  { format: 'A3', orientation: 'portrait', label: 'A3 retrato' },
  { format: 'A2', orientation: 'landscape', label: 'A2 paisagem' },
  { format: 'A2', orientation: 'portrait', label: 'A2 retrato' },
];
