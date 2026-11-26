import { Inject, inject, Injectable, InjectionToken, NgZone } from '@angular/core';

import { TrackingEvent } from '../../tracking-event';
import { TrackingMapper } from '../../tracking-mapper';
import { TrackingProvider } from '../../tracking-provider';
import { MixpanelEvent } from './mixpanel-event';

export const MIXPANEL_MAPPERS = new InjectionToken('MIXPANEL_MAPPERS');

@Injectable()
export class MixpanelTrackingProvider extends TrackingProvider {
  readonly #zone = inject(NgZone);

  constructor(@Inject(MIXPANEL_MAPPERS) mappers: Map<string, TrackingMapper<TrackingEvent<any>, any>>) {
    super(mappers);
  }

  id(): string {
    return 'mixpanel';
  }

  track(event: MixpanelEvent): void {
    const w = window as any;

    if (w && w.mixpanel) {
      this.#zone.runOutsideAngular(() => {
        w.mixpanel.track(event.event, event.elements);
      });
    }
  }
}
