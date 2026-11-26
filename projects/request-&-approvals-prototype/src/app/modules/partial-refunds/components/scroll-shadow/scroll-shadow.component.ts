import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  type Signal,
} from '@angular/core';

import { ScrollShadowAxis } from '../../models/scroll-shadow-axis.model';

/**
 * Wraps content that is wider, or taller, than the space it is given and marks the edges that still
 * have more behind them. Purely presentational: it reads the scroll position and owns nothing else.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'scroll-shadow',
    '[class.scroll-shadow--after]': 'hasAfter()',
    '[class.scroll-shadow--before]': 'hasBefore()',
    '[class.scroll-shadow--block]': 'isBlockAxis()',
  },
  selector: 'app-scroll-shadow',
  styleUrl: './scroll-shadow.component.scss',
  templateUrl: './scroll-shadow.component.html',
})
export class ScrollShadowComponent {
  /** Under this, a scroll position counts as sitting on the edge: sub-pixel layouts never land on 0. */
  static readonly edgeToleranceInPx = 1;

  readonly axis = input<ScrollShadowAxis>(ScrollShadowAxis.Inline);

  protected readonly hasAfter = signal(false);
  protected readonly hasBefore = signal(false);
  protected readonly isBlockAxis: Signal<boolean> = computed(() => this.axis() === ScrollShadowAxis.Block);

  /** Not a `#` field: Angular rejects a signal query declared as ES private. */
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  readonly #destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const viewport = this.viewport().nativeElement;
      this.#measure(viewport);

      /**
       * Scrolling is not the only thing that changes what is reachable: the viewport narrowing and
       * the table itself growing a column both do, and neither fires a scroll event.
       */
      const observer = new ResizeObserver(() => this.#measure(viewport));
      observer.observe(viewport);

      const content = viewport.firstElementChild;

      if (content !== null) {
        observer.observe(content);
      }

      this.#destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onScroll(): void {
    this.#measure(this.viewport().nativeElement);
  }

  #measure(viewport: HTMLElement): void {
    /** A right-to-left viewport counts leftwards from zero, so the distance travelled is the size. */
    const travelled = this.isBlockAxis() ? viewport.scrollTop : Math.abs(viewport.scrollLeft);
    const total = this.isBlockAxis() ? viewport.scrollHeight - viewport.clientHeight : viewport.scrollWidth - viewport.clientWidth;

    this.hasAfter.set(total - travelled > ScrollShadowComponent.edgeToleranceInPx);
    this.hasBefore.set(travelled > ScrollShadowComponent.edgeToleranceInPx);
  }
}
