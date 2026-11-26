import { ResendOrderConfirmationEmailEvent } from '../../core/events/resend-order-confirmation-email';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ResendOrderConfirmationEmailMapper implements MixpanelTrackingMapper<ResendOrderConfirmationEmailEvent> {
  map(event: ResendOrderConfirmationEmailEvent): MixpanelEvent {
    return new MixpanelEvent('resend_order_purchase_confirmation_email', event.data);
  }
}
