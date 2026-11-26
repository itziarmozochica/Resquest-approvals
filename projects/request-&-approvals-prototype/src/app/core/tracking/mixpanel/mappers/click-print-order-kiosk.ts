import { ClickPrintOrderKioskEvent } from '../../core/events/click-print-order-kiosk';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickPrintOrderKioskMapper implements MixpanelTrackingMapper<ClickPrintOrderKioskEvent> {
  map(event: ClickPrintOrderKioskEvent): MixpanelEvent {
    return new MixpanelEvent('click_print_order_kiosk', event.data);
  }
}
