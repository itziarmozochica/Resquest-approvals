import { ViewOrderHistoryEvent } from '../../core/events/view-order-history';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ViewOrderHistoryMapper implements MixpanelTrackingMapper<ViewOrderHistoryEvent> {
  map(event: ViewOrderHistoryEvent): MixpanelEvent {
    return new MixpanelEvent('fz_order_history_viewed', event.data);
  }
}
