import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: '[appFitText]',
  standalone: true,
})
export class FitTextDirective {
  // The text keeps its design-system size until it no longer fits in maxLines.
  // From there the font size is reduced (down to minFontSizePx) until it fits.
  readonly maxLines = input(3);
  readonly minFontSizePx = input(24);

  static readonly fontSizeStepPx = 1;

  readonly #element: ElementRef<HTMLElement> = inject(ElementRef);
  readonly #destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const element = this.#element.nativeElement;

      // Re-fit when the text content changes. Observing the DOM (rather than an
      // input) keeps the directive agnostic to how the host feeds the text:
      // interpolation, signal, @Input or async pipe all work the same way. We do
      // not observe attributes, so our own font-size mutations never re-trigger this.
      const mutationObserver = new MutationObserver(() => this.#fitText());
      mutationObserver.observe(element, { characterData: true, childList: true, subtree: true });

      // Only the available width affects line wrapping, so we re-fit on width
      // changes. Tracking the width avoids a feedback loop with our own font
      // size mutations (which only change the text height, not its width).
      let lastWidthPx = element.clientWidth;
      const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        const widthPx = entries[0]?.contentRect.width ?? lastWidthPx;
        if (widthPx === lastWidthPx) {
          return;
        }
        lastWidthPx = widthPx;
        this.#fitText();
      });
      resizeObserver.observe(element);

      this.#destroyRef.onDestroy(() => {
        mutationObserver.disconnect();
        resizeObserver.disconnect();
      });

      this.#fitText();
    });
  }

  #fitText(): void {
    const element = this.#element.nativeElement;
    // Reset to the design-system font so measurements start from the base size.
    element.style.removeProperty('font-size');
    element.style.removeProperty('line-height');
    element.style.removeProperty('display');
    const styles = getComputedStyle(element);
    const baseFontSizePx = this.#pxToNumber(styles.fontSize);
    const baseLineHeightPx = this.#pxToNumber(styles.lineHeight);
    if (baseFontSizePx === 0 || baseLineHeightPx === 0) {
      return;
    }
    const lineHeightRatio = baseLineHeightPx / baseFontSizePx;
    // Measure the full (unclamped) height while shrinking the font, keeping the
    // line height proportional so the result still matches the base ratio.
    element.style.display = 'block';
    element.style.lineHeight = String(lineHeightRatio);
    let fontSizePx = baseFontSizePx;
    element.style.fontSize = `${fontSizePx}px`;
    const maxLines = this.maxLines();
    const minFontSizePx = this.minFontSizePx();
    // The line height scales with the font, so the ceiling for `maxLines` lines
    // must be recomputed from the current font size on every iteration; a fixed
    // ceiling would let the text keep more than `maxLines` lines once shrunk.
    // The +1px tolerance absorbs sub-pixel rounding around an exact line count.
    while (element.scrollHeight > maxLines * lineHeightRatio * fontSizePx + 1 && fontSizePx > minFontSizePx) {
      fontSizePx -= FitTextDirective.fontSizeStepPx;
      element.style.fontSize = `${fontSizePx}px`;
    }
    // Restore the clamped box so the ellipsis fallback applies for text that
    // does not fit even at the minimum font size.
    element.style.removeProperty('display');
    if (fontSizePx >= baseFontSizePx) {
      // It fits at the current size: drop our overrides to honour the design system.
      element.style.removeProperty('font-size');
      element.style.removeProperty('line-height');
    }
  }

  #pxToNumber(value: string): number {
    const parsed = Number(value.replace('px', ''));
    return isNaN(parsed) ? 0 : parsed;
  }
}
