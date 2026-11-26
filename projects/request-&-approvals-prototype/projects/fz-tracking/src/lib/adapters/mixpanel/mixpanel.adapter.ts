import { DOCUMENT } from '@angular/common';
import { inject, NgZone } from '@angular/core';

import type { TrackingAdapter, TrackingTrackPayload } from '../../core/tracking-adapter';
import { TRACKING_ADAPTERS, type TrackingFeature } from '../../core/tracking.providers';

export interface MixpanelSDK {
  identify: (id: string) => void;
  track: (name: string, props?: Record<string, unknown>) => void;
}

export interface MixpanelMapperEntry {
  readonly id: string;
  readonly map: ((data: unknown) => Readonly<Record<string, unknown>>) | null;
  readonly name: string;
}

const getPassThroughEventProperties = (event: unknown): Record<string, unknown> => {
  if (event !== null && event !== undefined && typeof event === 'object') {
    return event as Record<string, unknown>;
  }

  return {};
};

const toMixpanelProperties = (
  context: Record<string, unknown>,
  event: unknown,
  map: MixpanelMapperEntry['map'],
): Record<string, unknown> => {
  const eventProperties = map ? map(event) : getPassThroughEventProperties(event);

  return { ...context, ...eventProperties };
};

export interface MixpanelOptions {
  /** Hands each event to the SDK after the current task and outside the Angular zone. */
  readonly deferred?: boolean;
}

const mixpanelAdapter = (mixpanelMappers: readonly MixpanelMapperEntry[], { deferred = false }: MixpanelOptions): TrackingAdapter => {
  const win = inject(DOCUMENT).defaultView as (Window & { mixpanel?: MixpanelSDK }) | null;
  const zone = inject(NgZone);
  const mapperById = new Map(mixpanelMappers.map(entry => [entry.id, entry]));

  const send = (sdk: MixpanelSDK, name: string, properties: Record<string, unknown>): void => {
    if (!deferred) {
      zone.runOutsideAngular(() => {
        sdk.track(name, properties);
      });
      return;
    }

    zone.runOutsideAngular(() =>
      setTimeout(() => {
        try {
          sdk.track(name, properties);
        } catch (err) {
          console.error('[fz-tracking] adapter failed:', err);
        }
      }),
    );
  };

  return {
    isSdkReady: () => Boolean(win?.mixpanel),
    track(eventId, { context, event }: TrackingTrackPayload) {
      const sdk = win?.mixpanel;
      if (!sdk) return;

      const mapper = mapperById.get(eventId);
      if (!mapper) {
        send(sdk, eventId, toMixpanelProperties(context, event, null));
        return;
      }

      send(sdk, mapper.name, toMixpanelProperties(context, event, mapper.map));
    },
  };
};

/**
 * Registers the Mixpanel tracking adapter backed by the global `window.mixpanel` SDK.
 *
 * Pass mapper entries from {@link mixpanelMapper} to translate internal event ids into
 * Mixpanel event names and shape event properties.
 */
export const withMixpanel = (mixpanelMappers: readonly MixpanelMapperEntry[] = [], options: MixpanelOptions = {}): TrackingFeature => ({
  providers: [
    {
      multi: true,
      provide: TRACKING_ADAPTERS,
      useFactory: () => mixpanelAdapter(mixpanelMappers, options),
    },
  ],
});
