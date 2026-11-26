import { SearchOrdersEvent } from '../../core/events/search-orders';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SearchOrdersMapper implements MixpanelTrackingMapper<SearchOrdersEvent> {
  map(event: SearchOrdersEvent): MixpanelEvent {
    return new MixpanelEvent('search_orders', event.data);
  }
}
