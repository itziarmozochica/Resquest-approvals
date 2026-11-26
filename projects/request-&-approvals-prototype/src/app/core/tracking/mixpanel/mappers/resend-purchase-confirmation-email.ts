import { ResendPurchaseConfirmationEmailEvent } from '../../core/events/resend-purchase-confirmation-email';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ResendPurchaseConfirmationEmailMapper implements MixpanelTrackingMapper<ResendPurchaseConfirmationEmailEvent> {
  map(event: ResendPurchaseConfirmationEmailEvent): MixpanelEvent {
    return new MixpanelEvent('resend_purchase_confirmation_email', event.data);
  }
}
