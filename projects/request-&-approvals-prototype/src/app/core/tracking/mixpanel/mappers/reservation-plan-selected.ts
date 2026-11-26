import { ReservationPlanSelectedEvent } from '../../core/events/reservation-plan-selected';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ReservationPlanSelectedMapper implements MixpanelTrackingMapper<ReservationPlanSelectedEvent> {
  map(event: ReservationPlanSelectedEvent): MixpanelEvent {
    return new MixpanelEvent('reservation_plan_selected', event.data);
  }
}
