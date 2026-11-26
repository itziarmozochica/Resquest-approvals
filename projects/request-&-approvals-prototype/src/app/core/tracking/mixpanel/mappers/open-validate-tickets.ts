import { OpenValidateTicketsEvent } from '../../core/events/open-validate-tickets';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class OpenValidateTicketsMapper implements MixpanelTrackingMapper<OpenValidateTicketsEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('open_validate_tickets', event.data);
  }
}
