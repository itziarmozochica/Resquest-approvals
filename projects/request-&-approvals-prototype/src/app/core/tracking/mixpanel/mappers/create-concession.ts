import { CreateConcessionEvent } from '../../core/events/create-concession';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class CreateConcessionMapper implements MixpanelTrackingMapper<CreateConcessionEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('create_concession', event.data);
  }
}
