import { ClickOrdersEvent } from '../../core/events/click-orders';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOrdersMapper implements MixpanelTrackingMapper<ClickOrdersEvent> {
  map(event: ClickOrdersEvent): MixpanelEvent {
    return new MixpanelEvent('click_orders', event.data);
  }
}
