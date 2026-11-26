import { ClickKioskPaymentEvent } from '../../core/events/click-kiosk-payment';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickKioskPaymentMapper implements MixpanelTrackingMapper<ClickKioskPaymentEvent> {
  map(event: ClickKioskPaymentEvent): MixpanelEvent {
    return new MixpanelEvent('click_kiosk_payment', event.data);
  }
}
