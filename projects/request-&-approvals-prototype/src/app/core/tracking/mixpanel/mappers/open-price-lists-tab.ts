import { OpenPriceListsTabEvent } from '../../core/events/open-price-lists-tab';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenPriceListsTabMapper implements MixpanelTrackingMapper<OpenPriceListsTabEvent> {
  map(event: OpenPriceListsTabEvent): MixpanelEvent {
    return new MixpanelEvent('open_price_lists_tab', event.data);
  }
}
