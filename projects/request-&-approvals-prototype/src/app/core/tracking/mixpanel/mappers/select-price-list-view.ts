import { SelectPriceListViewEvent } from '../../core/events/select-price-list-view';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SelectPriceListViewMapper implements MixpanelTrackingMapper<SelectPriceListViewEvent> {
  map(event: SelectPriceListViewEvent): MixpanelEvent {
    return new MixpanelEvent('select_price_list_view', event.data);
  }
}
