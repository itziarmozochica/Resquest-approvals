import { CreatePriceListEvent } from '../../core/events/create-price-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreatePriceListMapper implements MixpanelTrackingMapper<CreatePriceListEvent> {
  map(event: CreatePriceListEvent): MixpanelEvent {
    return new MixpanelEvent('create_price_list', event.data);
  }
}
