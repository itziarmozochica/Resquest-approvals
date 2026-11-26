import { ClickOrderEvent } from '../../core/events/click-order';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickOrderMapper implements MixpanelTrackingMapper<ClickOrderEvent> {
  map(event: ClickOrderEvent): MixpanelEvent {
    return new MixpanelEvent('click_order', event.data);
  }
}
