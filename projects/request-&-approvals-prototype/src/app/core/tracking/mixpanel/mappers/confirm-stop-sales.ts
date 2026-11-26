import { ConfirmStopSalesEvent } from '../../core/events/confirm-stop-sales';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmStopSalesMapper implements MixpanelTrackingMapper<ConfirmStopSalesEvent> {
  map(event: ConfirmStopSalesEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_stop_sales', event.data);
  }
}
