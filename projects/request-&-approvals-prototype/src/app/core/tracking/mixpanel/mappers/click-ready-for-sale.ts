import { ClickReadyForSaleEvent } from '../../core/events/click-ready-for-sale';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickReadyForSaleMapper implements MixpanelTrackingMapper<ClickReadyForSaleEvent> {
  map(event: ClickReadyForSaleEvent): MixpanelEvent {
    return new MixpanelEvent('click_ready_for_sale', event.data);
  }
}
