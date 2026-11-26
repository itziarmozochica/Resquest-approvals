import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Glyphs the description builder and the block-description translation cards
 * actually render — the union of the palette/canvas literals and the
 * per-block-type icons. Used to subset the font request so only these are
 * fetched instead of the full Material Symbols variable font.
 *
 * Exported so a unit test can assert every block-type icon is covered here (see
 * the spec's drift guard) — a glyph missing from this list is fetched by nobody
 * and renders as its raw keyword text.
 */
export const MATERIAL_SYMBOLS_ICON_NAMES: readonly string[] = [
  'add',
  'arrow_forward',
  'badge',
  'calendar_month',
  'check',
  'close',
  'close_fullscreen',
  'cloud_upload',
  'confirmation_number',
  'delete',
  'grid_view',
  'height',
  'image',
  'location_on',
  'movie',
  'notes',
  'open_in_full',
  'progress_activity',
  'sell',
  'tab',
  'title',
  'tune',
];

/** `<link>` id that guarantees the stylesheet is injected at most once. */
const MATERIAL_SYMBOLS_LINK_ID = 'fz-material-symbols-font';
/** `<style>` id for the base rule that hides the ligature keywords pre-load. */
const MATERIAL_SYMBOLS_STYLE_ID = 'fz-material-symbols-base';
/** Class flipped onto `<html>` once the stylesheet has loaded, revealing glyphs. */
const MATERIAL_SYMBOLS_READY_CLASS = 'fz-material-symbols-ready';

/**
 * Lazily injects the Material Symbols Outlined icon font used by the description
 * builder (`/content-edit`) and the block-description translation cards
 * (`/translations-edit`).
 *
 * Loaded on demand — the first time a surface that renders these glyphs mounts —
 * rather than globally from `index.html`, so users who never open those screens
 * don't fetch it. The `<link>` is guarded by an id so it's added a single time;
 * the browser then caches the font and reuses it across re-renders and reloads
 * (no per-render cost). The request is subset via `icon_names` to only the
 * glyphs actually used.
 *
 * Flash handling: the icon class (`font-family: 'Material Symbols Outlined'`)
 * and its `@font-face` both live in the remote stylesheet, so until it loads a
 * `<span class="material-symbols-outlined">delete</span>` would show the raw
 * word. We inject a tiny base rule that keeps those glyphs hidden until the
 * stylesheet's `load` fires (revealed via a class on `<html>`), so the keywords
 * never flash. This hides via `visibility` — deliberately NOT `color` — so it
 * never overrides the per-component colour rules that paint these icons (e.g.
 * the brand-blue properties-panel and translation-section headers); a `color`
 * rule here would win on specificity and force every icon to the inherited text
 * colour. `display=block` then avoids a fallback-glyph flash while the font file
 * resolves. `error` also reveals, so a blocked/offline CDN never leaves the
 * icons permanently invisible.
 */
@Injectable({ providedIn: 'root' })
export class MaterialSymbolsFontLoader {
  readonly #document = inject(DOCUMENT);

  ensureLoaded(): void {
    if (this.#document.getElementById(MATERIAL_SYMBOLS_LINK_ID)) {
      return;
    }

    const style = this.#document.createElement('style');
    style.id = MATERIAL_SYMBOLS_STYLE_ID;
    style.textContent =
      '.material-symbols-outlined{visibility:hidden}' +
      `html.${MATERIAL_SYMBOLS_READY_CLASS} .material-symbols-outlined{visibility:visible}`;
    this.#document.head.appendChild(style);

    const reveal = (): void => {
      this.#document.documentElement.classList.add(MATERIAL_SYMBOLS_READY_CLASS);
    };

    const link = this.#document.createElement('link');
    link.id = MATERIAL_SYMBOLS_LINK_ID;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0' +
      `&icon_names=${MATERIAL_SYMBOLS_ICON_NAMES.join(',')}&display=block`;
    // Attach before appending so the event is never missed for a cached response.
    link.addEventListener('load', reveal);
    link.addEventListener('error', reveal);
    this.#document.head.appendChild(link);
  }
}
