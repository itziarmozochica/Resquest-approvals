import { ClickWhatsappPopupEvent } from '../../core/events/click-whatsapp-popup';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickWhatsappPopupMapper implements MixpanelTrackingMapper<ClickWhatsappPopupEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_whatsapp_popup', event.data);
  }
}
