import { SendWebViewEvent } from '../../core/events/send-web-view';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SendWebViewMapper implements MixpanelTrackingMapper<SendWebViewEvent> {
  map(event: SendWebViewEvent): MixpanelEvent {
    return new MixpanelEvent('send_web_view', event.data);
  }
}
