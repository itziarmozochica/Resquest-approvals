import { ClickOrdersBulkRescheduleEvent } from '../../core/events/click-orders-bulk-reschedule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOrdersBulkRescheduleMapper implements MixpanelTrackingMapper<ClickOrdersBulkRescheduleEvent> {
  map(event: ClickOrdersBulkRescheduleEvent): MixpanelEvent {
    return new MixpanelEvent('click_orders_bulk_reschedule', event.data);
  }
}
