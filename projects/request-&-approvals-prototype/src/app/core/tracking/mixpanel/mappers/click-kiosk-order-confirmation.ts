import { ClickKioskOrderConfirmationEvent } from '../../core/events/click-kiosk-order-confirmation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickKioskOrderConfirmationMapper implements MixpanelTrackingMapper<ClickKioskOrderConfirmationEvent> {
  map(event: ClickKioskOrderConfirmationEvent): MixpanelEvent {
    return new MixpanelEvent('click_kiosk_order_confirmation', event.data);
  }
}
