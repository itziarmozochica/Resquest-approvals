import bidiFactory from 'bidi-js';

/**
 * pdfmake has no Unicode bidirectional (UAX #9) support: it lays glyphs out in logical
 * (memory) order, so Hebrew/Arabic runs and mixed RTL/LTR strings (e.g. "אזור D") render
 * scrambled. We pre-reorder each string into visual order before handing it to pdfmake,
 * using the document base direction (LTR for an English UI ticket, RTL for a Hebrew one).
 */
const bidi = bidiFactory();

// Strong RTL script ranges: Hebrew, Arabic, Syriac, Thaana, NKo, Arabic Extended-A,
// and Arabic presentation forms. Used to skip the (expensive) reorder for pure-LTR text.
const RTL_CHAR_REGEX =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/;

const TEXT_CONTAINER_KEYS = ['text', 'columns', 'stack', 'ul', 'ol'] as const;

// Mirrors the RTL language list in DirectionService; kept local so the PDF generators stay
// decoupled from that signal-based service (which needs a live TranslateService).
const RTL_LANGUAGE_CODES = ['ar', 'he', 'fa', 'ur'];

export type BidiBaseDirection = 'ltr' | 'rtl';

export function resolveBidiBaseDirection(lang: string | null | undefined): BidiBaseDirection {
  const code = (lang ?? '').split('-')[0].toLowerCase();
  return RTL_LANGUAGE_CODES.includes(code) ? 'rtl' : 'ltr';
}

export function containsRtlText(text: string): boolean {
  return RTL_CHAR_REGEX.test(text);
}

// Walks the text-bearing nodes (skipping qr/image/canvas) to detect any RTL content.
// Used to force a Unicode font: the brand Montserrat font is Latin-only and renders
// Hebrew/Arabic (and the ₪ symbol) as tofu boxes.
export function pdfContentContainsRtl(node: unknown): boolean {
  if (typeof node === 'string') {
    return containsRtlText(node);
  }
  if (Array.isArray(node)) {
    return node.some(child => pdfContentContainsRtl(child));
  }
  if (node !== null && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    for (const key of TEXT_CONTAINER_KEYS) {
      if (key in obj && pdfContentContainsRtl(obj[key])) {
        return true;
      }
    }
    const table = obj['table'];
    if (table !== null && typeof table === 'object' && Array.isArray((table as { body?: unknown }).body)) {
      return (table as { body: unknown[][] }).body.some(row => row.some(cell => pdfContentContainsRtl(cell)));
    }
  }
  return false;
}

export function reorderBidiText(text: string, baseDirection: BidiBaseDirection): string {
  if (!containsRtlText(text)) {
    return text;
  }
  const embeddingLevels = bidi.getEmbeddingLevels(text, baseDirection);
  return bidi.getReorderedString(text, embeddingLevels);
}

/**
 * Returns a deep copy of a pdfmake content node with every text string reordered into
 * visual order. Non-text nodes (qr, image, canvas) are preserved untouched so QR payloads
 * and assets are never altered.
 */
export function reorderPdfContentBidi<T>(node: T, baseDirection: BidiBaseDirection): T {
  return reorderNode(node, baseDirection) as T;
}

function reorderNode(node: unknown, baseDirection: BidiBaseDirection): unknown {
  if (typeof node === 'string') {
    return reorderBidiText(node, baseDirection);
  }
  if (Array.isArray(node)) {
    return node.map(child => reorderNode(child, baseDirection));
  }
  if (node !== null && typeof node === 'object') {
    return reorderObjectNode(node as Record<string, unknown>, baseDirection);
  }
  return node;
}

function reorderObjectNode(node: Record<string, unknown>, baseDirection: BidiBaseDirection): Record<string, unknown> {
  const result: Record<string, unknown> = { ...node };
  for (const key of TEXT_CONTAINER_KEYS) {
    if (key in result) {
      result[key] = reorderNode(result[key], baseDirection);
    }
  }
  const table = result['table'];
  if (table !== null && typeof table === 'object' && Array.isArray((table as { body?: unknown }).body)) {
    const typedTable = table as { body: unknown[][] };
    result['table'] = {
      ...typedTable,
      body: typedTable.body.map(row => row.map(cell => reorderNode(cell, baseDirection))),
    };
  }
  return result;
}
