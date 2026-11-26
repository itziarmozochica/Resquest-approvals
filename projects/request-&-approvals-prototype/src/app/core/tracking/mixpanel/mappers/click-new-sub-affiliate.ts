import { ClickNewSubAffiliateEvent } from '../../core/events/click-new-sub-affiliate';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickNewSubAffiliateMapper implements MixpanelTrackingMapper<ClickNewSubAffiliateEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_new_sub_affiliate', event.data);
  }
}
