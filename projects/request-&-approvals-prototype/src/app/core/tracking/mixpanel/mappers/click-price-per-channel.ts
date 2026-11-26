import { ClickPricePerChannelEvent } from '../../core/events/click-price-per-channel';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickPricePerChannelMapper implements MixpanelTrackingMapper<ClickPricePerChannelEvent> {
  map(event: ClickPricePerChannelEvent): MixpanelEvent {
    return new MixpanelEvent('click_price_per_channel', event.data);
  }
}
