import { ClickNewOrderEvent } from '../../core/events/click-new-order';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickNewOrderMapper implements MixpanelTrackingMapper<ClickNewOrderEvent> {
  map(event: ClickNewOrderEvent): MixpanelEvent {
    return new MixpanelEvent('click_new_order', event.data);
  }
}
