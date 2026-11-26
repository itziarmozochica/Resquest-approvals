import { CreateSubAffiliateEvent } from '../../core/events/create-sub-affiliate';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class CreateSubAffiliateMapper implements MixpanelTrackingMapper<CreateSubAffiliateEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('create_sub_affiliate', event.data);
  }
}
