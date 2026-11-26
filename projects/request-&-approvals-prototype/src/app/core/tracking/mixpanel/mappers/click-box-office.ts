import { ClickBoxOfficeEvent } from '../../core/events/click-box-office';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickBoxOfficeMapper implements MixpanelTrackingMapper<ClickBoxOfficeEvent> {
  map(event: ClickBoxOfficeEvent): MixpanelEvent {
    return new MixpanelEvent('click_box_office', event.data);
  }
}
