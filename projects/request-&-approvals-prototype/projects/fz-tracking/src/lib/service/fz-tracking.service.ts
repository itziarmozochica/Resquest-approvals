import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';

import type { TrackingEvent } from '../core/tracking-event';
import { collectHierarchicalMultiProviders, TRACKING_ADAPTERS, TRACKING_CONTEXT } from '../core/tracking.providers';

/**
 * Dispatches tracking events to every registered adapter whose SDK is ready.
 *
 * Typically used via {@link TrackClickDirective}, {@link TrackViewDirective}, or injected
 * directly for imperative tracking.
 */
@Injectable()
export class FzTrackingService {
  readonly #injector = inject(Injector);
  readonly #adapters = inject(TRACKING_ADAPTERS, { optional: true }) ?? [];
  readonly #contextFns = collectHierarchicalMultiProviders(this.#injector, TRACKING_CONTEXT);

  /** Merges global context and forwards the event to each ready tracking adapter. */
  track<Id extends string, Data>(event: TrackingEvent<Id, Data>): void {
    const context = this.#contextFns.reduce<Record<string, unknown>>(
      (acc, fn) => ({ ...acc, ...runInInjectionContext(this.#injector, fn) }),
      {},
    );

    for (const adapter of this.#adapters) {
      try {
        if (adapter.isSdkReady()) {
          adapter.track(event.id, { context, event: event.data });
        }
      } catch (err) {
        console.error('[fz-tracking] adapter failed:', err);
      }
    }
  }
}
