import { CopyPaymentLinkEvent } from '../../core/events/copy-payment-link';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CopyPaymentLinkMapper implements MixpanelTrackingMapper<CopyPaymentLinkEvent> {
  map(event: CopyPaymentLinkEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Payment Link|CopyPaymentLink', event.data);
  }
}
