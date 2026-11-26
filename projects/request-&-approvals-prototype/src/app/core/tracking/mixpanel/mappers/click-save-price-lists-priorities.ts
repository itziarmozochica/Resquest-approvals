import { ClickSavePriceListsPrioritiesEvent } from '../../core/events/click-save-price-lists-priorities';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickSavePriceListsPrioritiesMapper implements MixpanelTrackingMapper<ClickSavePriceListsPrioritiesEvent> {
  map(event: ClickSavePriceListsPrioritiesEvent): MixpanelEvent {
    return new MixpanelEvent('click_save_price_lists_priorities', event.data);
  }
}
