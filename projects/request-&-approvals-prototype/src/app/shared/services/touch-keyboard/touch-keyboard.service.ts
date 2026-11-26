import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { isScrollableY, isTextField } from './touch-keyboard.util';

const COARSE_POINTER_QUERY = '(pointer: coarse)';
// Room kept between the focused field and the top of the keyboard.
const FOCUSED_FIELD_MARGIN_PX = 16;
const INTERACTIVE_WIDGET_DIRECTIVE = 'interactive-widget';
const RESIZES_CONTENT = `${INTERACTIVE_WIDGET_DIRECTIVE}=resizes-content`;
const VIEWPORT_META_SELECTOR = 'meta[name="viewport"]';

/**
 * What the virtual keyboard does to the viewport on the device currently running the app.
 *
 * A coarse primary pointer is what separates a Fever POS terminal, a tablet or a phone — every
 * device that raises an on-screen keyboard when an input takes focus — from a desktop with a mouse,
 * where the keyboard is physical and none of this applies.
 *
 * `interactive-widget=resizes-content` makes the browser shrink the *layout* viewport while the
 * keyboard is up, instead of leaving it at full height and simply painting the keyboard on top
 * (`resizes-visual`, the Chrome default). With it, `100vh` shells and viewport-positioned popups
 * measure the space the user can actually see. It is applied by rewriting the viewport meta at
 * runtime rather than in `index.html`, so it stays scoped to the screens that opt in.
 */
@Injectable({
  providedIn: 'root',
})
export class TouchKeyboardService {
  readonly #document = inject(DOCUMENT);
  #focusedFieldWatch: AbortController | null = null;
  #previousViewportContent: string | null = null;

  hasOnScreenKeyboard(): boolean {
    return globalThis.matchMedia?.(COARSE_POINTER_QUERY).matches ?? false;
  }

  /**
   * Scrolls the focused text field back into the part of the screen the keyboard leaves.
   *
   * When the keyboard comes up the visible viewport shrinks (the layout viewport too on a Fever POS WebView and with
   * `resizes-content`), and a field that sat near the bottom of a drawer or a dialog ends up under the keyboard: the
   * browser only scrolls the page, which on the calendar never scrolls. This scrolls the field's own scroll
   * containers, innermost first, until it is inside the visual viewport. Focus that lands once the keyboard is already
   * up (the next field, or iOS resizing before the field takes focus) gets the same, a frame later, after the browser's
   * own focus scrolling. Stopped by `restoreViewport()`.
   */
  keepFocusedFieldInView(): void {
    const viewport: VisualViewport | null | undefined = globalThis.visualViewport;
    if (viewport === undefined || viewport === null || this.#focusedFieldWatch !== null) {
      return;
    }

    this.#focusedFieldWatch = new AbortController();
    const { signal } = this.#focusedFieldWatch;
    viewport.addEventListener('resize', () => this.#revealFocusedField(viewport), { signal });
    this.#document.addEventListener(
      'focusin',
      () =>
        this.#document.defaultView?.requestAnimationFrame(() => {
          if (!signal.aborted) {
            this.#revealFocusedField(viewport);
          }
        }),
      { signal },
    );
  }

  restoreViewport(): void {
    this.#focusedFieldWatch?.abort();
    this.#focusedFieldWatch = null;
    const meta = this.#viewportMeta();
    if (meta === null || this.#previousViewportContent === null) {
      return;
    }
    meta.content = this.#previousViewportContent;
    this.#previousViewportContent = null;
  }

  useResizesContentViewport(): void {
    const meta = this.#viewportMeta();
    if (meta === null || meta.content.includes(INTERACTIVE_WIDGET_DIRECTIVE)) {
      return;
    }
    this.#previousViewportContent = meta.content;
    meta.content = `${meta.content}, ${RESIZES_CONTENT}`;
  }

  #revealFocusedField(viewport: VisualViewport): void {
    const field = this.#document.activeElement;
    if (!(field instanceof HTMLElement) || !isTextField(field)) {
      return;
    }

    // Each scroll container shows only its own box, which a drawer's footer or header may already cut short; the
    // keyboard then cuts every box at the top of the visual viewport.
    for (let scroller = field.parentElement; scroller !== null; scroller = scroller.parentElement) {
      if (!isScrollableY(scroller, this.#document.defaultView)) {
        continue;
      }

      const scrollerBox = scroller.getBoundingClientRect();
      const fieldBox = field.getBoundingClientRect();
      const shownTop = Math.max(viewport.offsetTop, scrollerBox.top);
      const shownBottom = Math.min(viewport.offsetTop + viewport.height, scrollerBox.top + scroller.clientHeight);
      // A field that fits only without the full margins shares what is left of them, so its bottom never ends behind a
      // drawer's footer; one that cannot fit at all keeps its top margin.
      const spareHeight = shownBottom - shownTop - (fieldBox.bottom - fieldBox.top);
      const margin = spareHeight < 0 ? FOCUSED_FIELD_MARGIN_PX : Math.min(FOCUSED_FIELD_MARGIN_PX, spareHeight / 2);
      const visibleTop = shownTop + margin;
      const visibleBottom = shownBottom - margin;
      if (fieldBox.bottom <= visibleBottom) {
        return;
      }

      scroller.scrollTop += Math.max(0, Math.min(fieldBox.bottom - visibleBottom, fieldBox.top - visibleTop));
    }
  }

  #viewportMeta(): HTMLMetaElement | null {
    return this.#document.querySelector<HTMLMetaElement>(VIEWPORT_META_SELECTOR);
  }
}
