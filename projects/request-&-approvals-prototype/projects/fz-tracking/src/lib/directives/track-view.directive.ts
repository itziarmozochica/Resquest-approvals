import { booleanAttribute, DestroyRef, Directive, ElementRef, inject, input, type OnInit } from '@angular/core';

import type { TrackingEvent, TrackingEventFactory } from '../core/tracking-event';
import { FzTrackingService } from '../service/fz-tracking.service';

/**
 * Declaratively emits a tracking event when the host element becomes visible in the viewport.
 *
 * Visibility is detected with a per-element `IntersectionObserver`. When the element intersects,
 * the event is forwarded to {@link FzTrackingService.track}, which fans it out to every registered
 * tracking adapter. By default the event is emitted only once.
 *
 * Use only in application feature templates — not inside `projects/ignite/**`
 * (Ignite stays analytics-agnostic; host features wire tracking).
 *
 * @example
 * ```html
 * <!-- Track the first time the section is seen -->
 * <section [trackView]="myEvent({ field: value })">…</section>
 *
 * <!-- Track every time it re-enters the viewport, once at least 50% is visible -->
 * <section [trackView]="myEvent" [trackViewOnce]="false" [trackViewThreshold]="0.5">…</section>
 * ```
 */
@Directive({
  selector: '[trackView]',
  standalone: true,
})
export class TrackViewDirective implements OnInit {
  readonly #fzTracking = inject(FzTrackingService);
  readonly #element = inject<ElementRef<Element>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);

  /**
   * The event to track when the element is viewed. Accepts either a {@link TrackingEvent} instance
   * or a zero-argument {@link TrackingEventFactory}, which is invoked when the element intersects.
   * When omitted, the directive is inert (no observer is registered).
   */
  readonly trackView = input<TrackingEvent | TrackingEventFactory<string, void>>();

  /**
   * When `true` (default), the event is emitted only the first time the element becomes visible and
   * the observer is then disposed. Set to `false` to emit on every re-entry into the viewport.
   */
  readonly trackViewOnce = input(true, { transform: booleanAttribute });

  /**
   * The `IntersectionObserver` threshold: the fraction of the element (`0`–`1`) that must be visible
   * before the event fires. Defaults to `0` (any pixel visible).
   */
  readonly trackViewThreshold = input(0);

  #observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const trackView = this.trackView();
    if (trackView === undefined) {
      return;
    }

    this.#observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const trackViewEvent = this.trackView();
            if (trackViewEvent !== undefined) {
              const trackingEvent = typeof trackViewEvent === 'function' ? trackViewEvent() : trackViewEvent;
              this.#fzTracking.track(trackingEvent);

              if (this.trackViewOnce()) {
                this.#disconnect();
                break;
              }
            }
          }
        }
      },
      { threshold: this.trackViewThreshold() },
    );

    this.#observer.observe(this.#element.nativeElement);

    this.#destroyRef.onDestroy(() => {
      this.#disconnect();
    });
  }

  #disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }
}
