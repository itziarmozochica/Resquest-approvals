import { ClickReportsSubAffiliateEvent } from '../../core/events/click-reports-sub-affiliate';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickReportsSubAffiliateMapper implements MixpanelTrackingMapper<ClickReportsSubAffiliateEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_reports_sub_affiliate', event.data);
  }
}
