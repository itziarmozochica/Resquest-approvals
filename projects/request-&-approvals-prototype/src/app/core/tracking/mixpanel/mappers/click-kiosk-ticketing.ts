import { ClickKioskTicketingEvent } from '../../core/events/click-kiosk-ticketing';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickKioskTicketingMapper implements MixpanelTrackingMapper<ClickKioskTicketingEvent> {
  map(event: ClickKioskTicketingEvent): MixpanelEvent {
    return new MixpanelEvent('click_kiosk_ticketing', event.data);
  }
}
