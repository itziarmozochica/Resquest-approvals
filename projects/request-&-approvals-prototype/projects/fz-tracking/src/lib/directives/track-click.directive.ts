import { booleanAttribute, Directive, inject, input } from '@angular/core';

import type { TrackingEvent, TrackingEventFactory } from '../core/tracking-event';
import { FzTrackingService } from '../service/fz-tracking.service';

/**
 * Declaratively emits a tracking event when the host element is clicked.
 *
 * The event is forwarded to {@link FzTrackingService.track}, which fans it out to every
 * registered tracking adapter.
 *
 * Use only in application feature templates — not inside `projects/ignite/**`
 * (Ignite stays analytics-agnostic; host features wire tracking).
 *
 * @example
 * ```html
 * <!-- Pass a ready-made event -->
 * <button [trackClick]="myEvent({ field: value })">Buy</button>
 *
 * <!-- Or a zero-arg event factory; it is invoked on click -->
 * <button [trackClick]="myEvent">Buy</button>
 *
 * <!-- Prevent the click from bubbling to parent listeners -->
 * <button [trackClick]="myEvent" trackClickStopPropagation>Buy</button>
 * ```
 */
@Directive({
  host: { '(click)': 'onClick($event)' },
  selector: '[trackClick]',
  standalone: true,
})
export class TrackClickDirective {
  readonly #fzTracking = inject(FzTrackingService);

  /**
   * The event to track on click. Accepts either a {@link TrackingEvent} instance or a
   * zero-argument {@link TrackingEventFactory}, which is invoked at click time.
   */
  readonly trackClick = input.required<TrackingEvent | TrackingEventFactory<string, void>>();

  /**
   * When present (or `true`), calls `stopPropagation()` on the click event before tracking,
   * preventing the event from reaching parent click listeners. Defaults to `false`.
   */
  readonly trackClickStopPropagation = input(false, { transform: booleanAttribute });

  protected onClick(ev: MouseEvent): void {
    if (this.trackClickStopPropagation()) {
      ev.stopPropagation();
    }
    const value = this.trackClick();
    const trackingEvent = typeof value === 'function' ? value() : value;
    this.#fzTracking.track(trackingEvent);
  }
}
