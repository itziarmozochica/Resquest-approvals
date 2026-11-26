import { RescheduleOrderEvent } from '../../core/events/reschedule-order';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class RescheduleOrderMapper implements MixpanelTrackingMapper<RescheduleOrderEvent> {
  map(event: RescheduleOrderEvent): MixpanelEvent {
    return new MixpanelEvent('reschedule_order', event.data);
  }
}
