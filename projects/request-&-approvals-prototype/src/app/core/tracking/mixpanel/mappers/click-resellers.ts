import { ClickResellersEvent } from '../../core/events/click-resellers';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickResellersMapper implements MixpanelTrackingMapper<ClickResellersEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_resellers', event.data);
  }
}
