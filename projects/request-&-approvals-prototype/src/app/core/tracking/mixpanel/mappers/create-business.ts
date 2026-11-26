import { CreateBusinessEvent } from '../../core/events/create-business';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateBusinessMapper implements MixpanelTrackingMapper<CreateBusinessEvent> {
  map(event: CreateBusinessEvent): MixpanelEvent {
    return new MixpanelEvent('create_business', event.data);
  }
}
