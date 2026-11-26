import { ConfirmValidateTicketsEvent } from '../../core/events/confirm-validate-tickets';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmValidateTicketsMapper implements MixpanelTrackingMapper<ConfirmValidateTicketsEvent> {
  map(event: ConfirmValidateTicketsEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_validate_tickets', event.data);
  }
}
