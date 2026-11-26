import { ReservationFlowStartedEvent } from '../../core/events/reservation-flow-started';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ReservationFlowStartedMapper implements MixpanelTrackingMapper<ReservationFlowStartedEvent> {
  map(event: ReservationFlowStartedEvent): MixpanelEvent {
    return new MixpanelEvent('reservation_flow_started', event.data);
  }
}
