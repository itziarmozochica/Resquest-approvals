import { ClickSearchOrdersEvent } from '@fz-original/app/core/tracking/core/events/click-search-orders';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickSearchOrdersMapper implements MixpanelTrackingMapper<ClickSearchOrdersEvent> {
  map(event: ClickSearchOrdersEvent): MixpanelEvent {
    return new MixpanelEvent('click_search_orders', event.data);
  }
}
