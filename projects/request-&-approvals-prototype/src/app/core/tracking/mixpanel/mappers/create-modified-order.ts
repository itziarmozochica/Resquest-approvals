import { CreateModifiedOrderEvent } from '../../core/events/create-modified-order';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateModifiedOrderMapper implements MixpanelTrackingMapper<CreateModifiedOrderEvent> {
  map(event: CreateModifiedOrderEvent): MixpanelEvent {
    return new MixpanelEvent('create_modified_order', event.data);
  }
}
