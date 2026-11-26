import { CreateOrderEvent } from '../../core/events/create-order';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateOrderMapper implements MixpanelTrackingMapper<CreateOrderEvent> {
  map(event: CreateOrderEvent): MixpanelEvent {
    return new MixpanelEvent('create_order', event.data);
  }
}
