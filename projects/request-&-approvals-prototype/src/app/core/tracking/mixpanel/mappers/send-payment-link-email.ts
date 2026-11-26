import { SendPaymentLinkEmailEvent } from '../../core/events/send-payment-link-email';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SendPaymentLinkEmailMapper implements MixpanelTrackingMapper<SendPaymentLinkEmailEvent> {
  map(event: SendPaymentLinkEmailEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Payment Link|SendPaymentLinkEmail', event.data);
  }
}
