import { ClickTicketsPerTimeslotEvent } from '../../core/events/click-tickets-per-timeslot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickTicketsPerTimeslotMapper implements MixpanelTrackingMapper<ClickTicketsPerTimeslotEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_tickets_per_timeslot', event.data);
  }
}
