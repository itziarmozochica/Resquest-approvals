import { LoadTicketsPerTimeslotEvent } from '../../core/events/load-tickets-per-timeslot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadTicketsPerTimeslotMapper implements MixpanelTrackingMapper<LoadTicketsPerTimeslotEvent> {
  map(event: LoadTicketsPerTimeslotEvent): MixpanelEvent {
    return new MixpanelEvent('load_tickets_per_timeslot', event.data);
  }
}
