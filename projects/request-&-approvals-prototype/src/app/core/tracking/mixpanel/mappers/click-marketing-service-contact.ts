import { ClickMarketingServiceContactEvent } from '../../core/events/click-marketing-service-contact';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickMarketingServiceContactMapper implements MixpanelTrackingMapper<ClickMarketingServiceContactEvent> {
  map(event: ClickMarketingServiceContactEvent): MixpanelEvent {
    return new MixpanelEvent('click_marketing_service_contact', event.data);
  }
}
