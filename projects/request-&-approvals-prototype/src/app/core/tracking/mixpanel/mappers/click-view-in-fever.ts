import { ClickViewInFeverEvent } from '../../core/events/click-view-in-fever';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickViewInFeverMapper implements MixpanelTrackingMapper<ClickViewInFeverEvent> {
  map(event: ClickViewInFeverEvent): MixpanelEvent {
    return new MixpanelEvent('click_view_in_fever', event.data);
  }
}
