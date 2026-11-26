import { Inject, inject, Injectable, NgZone } from '@angular/core';

import { MixpanelIdentifyData } from '../providers/mixpanel/mixpanel-identify-data';
import { MIXPANEL_MAPPERS, MixpanelTrackingProvider } from '../providers/mixpanel/mixpanel-tracking.provider';
import { TrackingEvent } from '../tracking-event';
import { TrackingMapper } from '../tracking-mapper';

@Injectable()
export class ExtendedMixpanelTrackingProvider extends MixpanelTrackingProvider {
  readonly #zone = inject(NgZone);

  constructor(@Inject(MIXPANEL_MAPPERS) mappers: Map<string, TrackingMapper<TrackingEvent<any>, any>>) {
    super(mappers);
  }

  identify(mixpanelIdentifyData?: MixpanelIdentifyData): void {
    if (!this.enabled || !mixpanelIdentifyData?.user_id) {
      return;
    }

    const w = window as any;

    if (!w.mixpanel) {
      return;
    }

    this.#zone.runOutsideAngular(() => {
      w.mixpanel.identify(mixpanelIdentifyData.user_id);
      w.mixpanel.people.set(mixpanelIdentifyData);
      w.mixpanel.people.set_once(mixpanelIdentifyData);
    });
  }
}
