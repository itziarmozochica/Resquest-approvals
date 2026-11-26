import { PrepareCartEvent } from '../../core/events/preprare-cart';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PrepareCartMapper implements MixpanelTrackingMapper<PrepareCartEvent> {
  map(event: PrepareCartEvent): MixpanelEvent {
    return new MixpanelEvent('prepare_cart', event.data);
  }
}
