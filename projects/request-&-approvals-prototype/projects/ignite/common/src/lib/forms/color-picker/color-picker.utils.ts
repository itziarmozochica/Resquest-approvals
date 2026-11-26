/**
 * Pure hex-color helpers for the color picker. Kept inside the design-system
 * library so it never depends on application code.
 */

/** Fallback returned when a value cannot be parsed into a valid six-digit hex. */
export const IGNT_COLOR_PICKER_DEFAULT_HEX = '#000000';

const HEX_PATTERN = /^#(?<hex>[0-9a-fA-F]{6})$/u;

/** Single source of truth for "is this a valid six-digit `#rrggbb` hex" (leading/trailing spaces ignored). */
export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

/**
 * Normalizes a value while the user is typing: keeps a single leading `#` and at
 * most six characters after it. An empty string stays empty so the field can be
 * cleared.
 */
export function normalizeHexInput(value: string): string {
  if (value.length === 0) {
    return '';
  }
  return `#${value.replace(/^#+/u, '')}`.slice(0, 7);
}

/**
 * Normalizes a finalized value: returns a lowercased `#rrggbb` when `value` is a
 * valid six-digit hex, otherwise `fallback`.
 */
export function normalizeHex(value: unknown, fallback: string = IGNT_COLOR_PICKER_DEFAULT_HEX): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const hex = HEX_PATTERN.exec(value.trim())?.groups?.hex;
  if (hex === undefined) {
    return fallback;
  }
  return `#${hex.toLowerCase()}`;
}
