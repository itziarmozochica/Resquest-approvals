import { Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';

/**
 * Paints a preset swatch with its own colour. Applies the colour imperatively
 * (the swatch colour is data, not styling) so the template needs no inline-style
 * binding.
 *
 * ### When to use
 * - Internal to `ignt-color-picker`, to fill each preset button with its hex.
 *
 * ### When NOT to use
 * - As a general background-colour setter → bind `[style.background-color]` (or a
 *   theme token) directly; this directive exists only to keep the picker template
 *   free of inline-style bindings.
 *
 * ### Related
 * - [Color Picker](?path=/docs/components-form-color-picker--docs) — the owning component
 */
@Directive({
  selector: '[igntColorSwatch]',
  standalone: true,
})
export class IgntColorSwatchDirective {
  /** Hex colour painted as the element's background. */
  readonly igntColorSwatch = input.required<string>();

  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      this.#renderer.setStyle(this.#element.nativeElement, 'background-color', this.igntColorSwatch());
    });
  }
}
