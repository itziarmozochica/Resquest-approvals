import { ConfirmIncreaseTicketCapacityEvent } from '../../core/events/confirm-increase-ticket-capacity';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmIncreaseTicketCapacityMapper implements MixpanelTrackingMapper<ConfirmIncreaseTicketCapacityEvent> {
  map(event: ConfirmIncreaseTicketCapacityEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_increase_ticket_capacity', event.data);
  }
}
