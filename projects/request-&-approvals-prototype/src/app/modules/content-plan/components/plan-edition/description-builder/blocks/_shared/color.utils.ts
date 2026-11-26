// Type-agnostic color helpers shared by the block components, the properties
// panel sections, the content-schema adapter and the translations editor.

/** Fever red — first shared preset and the fallback for invalid accent values. */
export const ACCENT_FALLBACK_HEX = '#e31b23';

/** Base accent palette shared by the color pickers across block types. */
export const SHARED_ACCENT_PRESETS = [ACCENT_FALLBACK_HEX, '#003087', '#0057ff', '#00a3a3', '#6f42c1'];

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function parseHex6(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function formatHex6(rgb: [number, number, number]): string {
  return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
}

function relativeLuminance(rgb: [number, number, number]): number {
  const lin = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = parseHex6(hexA);
  const b = parseHex6(hexB);
  if (a === null || b === null) return 1;
  const La = relativeLuminance(a);
  const Lb = relativeLuminance(b);
  const light = Math.max(La, Lb);
  const dark = Math.min(La, Lb);
  return (light + 0.05) / (dark + 0.05);
}

export function contrastTextForBackground(bgHex: string): string {
  const rgb = parseHex6(bgHex);
  if (rgb === null) return '#ffffff';
  return relativeLuminance(rgb) > 0.179 ? '#0a0a0a' : '#ffffff';
}

export function accentReadableOnWhite(accentHex: string): string {
  const rgb = parseHex6(accentHex);
  if (rgb === null) return ACCENT_FALLBACK_HEX;
  let r = rgb[0];
  let g = rgb[1];
  let b = rgb[2];
  for (let step = 0; step < 28; step++) {
    const candidate = formatHex6([r, g, b]);
    if (contrastRatio(candidate, '#ffffff') >= 4.5) return candidate;
    r = clamp255(r * 0.9);
    g = clamp255(g * 0.9);
    b = clamp255(b * 0.9);
  }
  return '#031419';
}

/** Live hex field normalization: single leading `#`, max 6 hex digits. Empty stays empty. */
export function normalizeHexInput(value: string): string {
  if (value.length === 0) return '';
  return ('#' + value.replace(/^#+/, '')).slice(0, 7);
}

export function normalizeAccentHex(value: unknown, fallback = ACCENT_FALLBACK_HEX): string {
  if (typeof value !== 'string') return fallback;
  const m = value.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  return '#' + m[1].toLowerCase();
}
