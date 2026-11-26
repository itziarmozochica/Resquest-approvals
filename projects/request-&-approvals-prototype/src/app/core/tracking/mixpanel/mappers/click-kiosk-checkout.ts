import { ClickKioskCheckoutEvent } from '../../core/events/click-kiosk-checkout';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickKioskCheckoutMapper implements MixpanelTrackingMapper<ClickKioskCheckoutEvent> {
  map(event: ClickKioskCheckoutEvent): MixpanelEvent {
    return new MixpanelEvent('click_kiosk_checkout', event.data);
  }
}
