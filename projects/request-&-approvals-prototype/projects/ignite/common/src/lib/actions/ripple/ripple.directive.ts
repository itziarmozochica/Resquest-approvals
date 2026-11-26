import { booleanAttribute, DestroyRef, Directive, ElementRef, inject, input, NgZone, Renderer2, RendererStyleFlags2 } from '@angular/core';

// Mirrors the `--ignt-ripple-duration` default in `ignt-base.scss`, only used if that
// stylesheet isn't loaded (so the reduced-motion cleanup timer still has a sane value).
const FALLBACK_RIPPLE_DURATION_MS = 500;

/**
 * Adds a Material-style expanding ripple on `pointerdown`, confined to the host's shape via
 * `currentColor` so it adapts to any sentiment/variant without configuration.
 *
 * Styling lives in `@ignite/theme`'s `ignt-base.scss`, the global stylesheet every consuming
 * app already loads (see `angular.json` "styles") — it can't be view-encapsulated since the
 * directive appends its nodes to whatever host it's applied to. Runs outside `NgZone` — the
 * ripple never triggers Angular change detection.
 *
 * ### When to use
 * - Any actionable element that benefits from visible press feedback (buttons, tiles, menu items)
 *
 * ### When NOT to use
 * - Elements that already provide their own press feedback (e.g. a colour/elevation change)
 */
@Directive({
  selector: '[igntRipple]',
  standalone: true,
})
export class IgntRippleDirective {
  /**
   * Suppresses the ripple entirely, e.g. while the host is disabled or loading.
   */
  rippleDisabled = input(false, { transform: booleanAttribute });

  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #renderer = inject(Renderer2);
  readonly #ngZone = inject(NgZone);
  readonly #destroyRef = inject(DestroyRef);

  #container: HTMLElement | null = null;
  #durationMs: number | null = null;

  constructor() {
    const abortController = new AbortController();
    this.#ngZone.runOutsideAngular(() => {
      this.#elementRef.nativeElement.addEventListener(
        'pointerdown',
        (event: PointerEvent) => {
          this.#onPointerDown(event);
        },
        { signal: abortController.signal },
      );
    });
    this.#destroyRef.onDestroy(() => {
      abortController.abort();
    });
  }

  #getContainer(host: HTMLElement): HTMLElement {
    if (this.#container) {
      return this.#container;
    }

    const position = getComputedStyle(host).position;
    if (position === 'static' || position === '') {
      this.#renderer.setStyle(host, 'position', 'relative');
    }

    // Renderer2.createElement() returns `any`; the tag name guarantees the element type.
    const container = this.#renderer.createElement('span') as HTMLElement;
    this.#renderer.addClass(container, 'ignt-ripple-container');
    this.#renderer.setAttribute(container, 'aria-hidden', 'true');
    this.#renderer.appendChild(host, container);
    this.#container = container;
    return container;
  }

  /**
   * Reads `--ignt-ripple-duration` from the stylesheet once and caches it, since it's the
   * same value for every ripple on this host. Falls back to a fixed default if the global
   * stylesheet (`ignt-base.scss`) isn't loaded, e.g. in a test environment.
   */
  #getDurationMs(container: HTMLElement): number {
    if (this.#durationMs !== null) {
      return this.#durationMs;
    }
    const cssTime = getComputedStyle(container).getPropertyValue('--ignt-ripple-duration').trim();
    this.#durationMs = parseCssTimeToMs(cssTime) ?? FALLBACK_RIPPLE_DURATION_MS;
    return this.#durationMs;
  }

  #onPointerDown(event: PointerEvent): void {
    if (this.rippleDisabled() || event.button !== 0) {
      return;
    }

    const host = this.#elementRef.nativeElement;
    const container = this.#getContainer(host);
    // Only the click origin needs measuring; `.ignt-ripple`'s own size (and thus the `scale`
    // it animates to) comes from `--ignt-ripple-size` in `ignt-base.scss`. The offset below is
    // read back by that same stylesheet's `transform` to centre the ripple on this point.
    const rect = host.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    // Renderer2.createElement() returns `any`; the tag name guarantees the element type.
    const ripple = this.#renderer.createElement('span') as HTMLElement;
    this.#renderer.addClass(ripple, 'ignt-ripple');
    // DashCase forces Renderer2 through `style.setProperty()` — plain `style[name] = value`
    // assignment doesn't reliably set custom properties across browsers.
    this.#renderer.setStyle(ripple, '--ignt-ripple-offset-x', `${offsetX}px`, RendererStyleFlags2.DashCase);
    this.#renderer.setStyle(ripple, '--ignt-ripple-offset-y', `${offsetY}px`, RendererStyleFlags2.DashCase);

    let removed = false;
    const removeRipple = (): void => {
      if (removed) {
        return;
      }
      removed = true;
      this.#renderer.removeChild(container, ripple);
    };
    this.#renderer.listen(ripple, 'animationend', removeRipple);
    // `prefers-reduced-motion` disables the CSS animation (see ignt-base.scss), so
    // `animationend` never fires for those users — this timeout is the only thing that removes
    // the ripple then.
    setTimeout(removeRipple, this.#getDurationMs(container));

    this.#renderer.appendChild(container, ripple);
  }
}

/**
 * Registered `<time>` custom properties report their computed value in seconds (e.g. `0.5s`),
 * not the `ms` they may have been declared with, so this can't just be a bare `parseFloat`.
 */
function parseCssTimeToMs(cssTime: string): number | null {
  if (cssTime.endsWith('ms')) {
    return parseFloat(cssTime);
  }
  if (cssTime.endsWith('s')) {
    return parseFloat(cssTime) * 1000;
  }
  return null;
}
