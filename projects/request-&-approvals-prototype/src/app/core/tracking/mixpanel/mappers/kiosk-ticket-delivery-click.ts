import { KioskTicketDeliveryClickEvent } from '../../core/events/kiosk-ticket-delivery';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class KioskTicketDeliveryClickMapper implements MixpanelTrackingMapper<KioskTicketDeliveryClickEvent> {
  map(event: KioskTicketDeliveryClickEvent): MixpanelEvent {
    return new MixpanelEvent('kiosk_ticket_delivery_click', event.data);
  }
}
