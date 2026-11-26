import { KioskTicketDeliveryAutoPrintEvent } from '../../core/events/kiosk-ticket-delivery-auto-print';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class KioskTicketDeliveryAutoPrintMapper implements MixpanelTrackingMapper<KioskTicketDeliveryAutoPrintEvent> {
  map(event: KioskTicketDeliveryAutoPrintEvent): MixpanelEvent {
    return new MixpanelEvent('kiosk_ticket_delivery_auto_print', event.data);
  }
}
