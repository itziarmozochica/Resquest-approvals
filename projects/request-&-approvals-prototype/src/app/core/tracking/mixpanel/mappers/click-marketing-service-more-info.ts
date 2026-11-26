import { ClickMarketingServiceMoreInfoEvent } from '../../core/events/click-marketing-service-more-info';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickMarketingServiceMoreInfoMapper implements MixpanelTrackingMapper<ClickMarketingServiceMoreInfoEvent> {
  map(event: ClickMarketingServiceMoreInfoEvent): MixpanelEvent {
    return new MixpanelEvent('click_marketing_service_more_info', event.data);
  }
}
