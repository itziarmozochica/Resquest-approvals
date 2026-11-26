import { ClickNewConcessionEvent } from '../../core/events/click-new-concession';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickNewConcessionMapper implements MixpanelTrackingMapper<ClickNewConcessionEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_new_concession', event.data);
  }
}
