import { ConfirmOrdersBulkRescheduleEvent } from '../../core/events/confirm-orders-bulk-reschedule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ConfirmOrdersBulkRescheduleMapper implements MixpanelTrackingMapper<ConfirmOrdersBulkRescheduleEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('confirm_orders_bulk_reschedule', event.data);
  }
}
