import { ClickBusinessesEvent } from '../../core/events/click-businesses';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickBusinessesMapper implements MixpanelTrackingMapper<ClickBusinessesEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_businesses', event.data);
  }
}
