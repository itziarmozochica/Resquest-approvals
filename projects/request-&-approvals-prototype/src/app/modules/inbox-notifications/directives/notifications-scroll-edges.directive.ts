import { Directive, effect, ElementRef, inject, input, output, signal, untracked, WritableSignal } from '@angular/core';

import { RESTING_SCROLL_EDGES, ScrollEdgesState } from '../models/scroll-edges-state.model';

/** Distance in px within which the scroll position still counts as touching an edge. */
const EDGE_THRESHOLD_PX = 4;

@Directive({
  host: {
    '[class.scroll-edges--more-below]': 'edges().moreBelow',
    '[class.scroll-edges--scrolled]': '!edges().atTop',
  },
  selector: '[appNotificationsScrollEdges]',
  standalone: true,
})
export class NotificationsScrollEdgesDirective {
  readonly enabled = input(false);

  readonly edgesChange = output<ScrollEdgesState>();

  protected readonly edges: WritableSignal<ScrollEdgesState> = signal(RESTING_SCROLL_EDGES);

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #frameId: number | null = null;

  constructor() {
    effect(onCleanup => {
      if (!this.enabled()) {
        untracked(() => this.#reset());
        return;
      }
      onCleanup(this.#observe());
    });
  }

  #measure(): void {
    const { clientHeight, scrollHeight, scrollTop } = this.#host.nativeElement;
    const next: ScrollEdgesState = {
      atTop: scrollTop <= EDGE_THRESHOLD_PX,
      moreBelow: scrollTop < scrollHeight - clientHeight - EDGE_THRESHOLD_PX,
    };
    const current = this.edges();
    if (current.atTop === next.atTop && current.moreBelow === next.moreBelow) return;

    this.edges.set(next);
    this.edgesChange.emit(next);
  }

  #observe(): () => void {
    const element = this.#host.nativeElement;
    const requestMeasure = (): void => this.#scheduleMeasure();

    element.addEventListener('scroll', requestMeasure, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(requestMeasure);
    resizeObserver?.observe(element);
    const mutationObserver = typeof MutationObserver === 'undefined' ? null : new MutationObserver(requestMeasure);
    mutationObserver?.observe(element, { childList: true, subtree: true });

    this.#scheduleMeasure();

    return (): void => {
      element.removeEventListener('scroll', requestMeasure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (this.#frameId !== null) {
        cancelAnimationFrame(this.#frameId);
        this.#frameId = null;
      }
    };
  }

  /** Mirrors #measure's change-gated emit so a disabled directive leaves its consumer's mirror in sync. */
  #reset(): void {
    const current = this.edges();
    if (current.atTop === RESTING_SCROLL_EDGES.atTop && current.moreBelow === RESTING_SCROLL_EDGES.moreBelow) return;

    this.edges.set(RESTING_SCROLL_EDGES);
    this.edgesChange.emit(RESTING_SCROLL_EDGES);
  }

  #scheduleMeasure(): void {
    if (this.#frameId !== null) return;
    this.#frameId = requestAnimationFrame(() => {
      this.#frameId = null;
      this.#measure();
    });
  }
}
