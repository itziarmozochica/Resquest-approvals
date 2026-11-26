import { UpdateTimeslotEvent } from '../../core/events/update-timeslot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateTimeslotMapper implements MixpanelTrackingMapper<UpdateTimeslotEvent> {
  map(event: UpdateTimeslotEvent): MixpanelEvent {
    return new MixpanelEvent('update_timeslot', event.data);
  }
}
