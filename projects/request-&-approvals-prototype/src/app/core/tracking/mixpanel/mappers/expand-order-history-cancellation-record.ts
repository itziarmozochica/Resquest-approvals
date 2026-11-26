import { ExpandOrderHistoryCancellationRecordEvent } from '../../core/events/expand-order-history-cancellation-record';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ExpandOrderHistoryCancellationRecordMapper implements MixpanelTrackingMapper<ExpandOrderHistoryCancellationRecordEvent> {
  map(event: ExpandOrderHistoryCancellationRecordEvent): MixpanelEvent {
    return new MixpanelEvent('fz_order_history_cancellation_record_expanded', event.data);
  }
}
