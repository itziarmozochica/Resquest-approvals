import { UpdatePlanDefaultCapacityPerTimeSlotEvent } from '../../core/events/update-plan-default-capacity-per-time-slot-event';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdatePlanDefaultCapacityPerTimeSlotMapper implements MixpanelTrackingMapper<UpdatePlanDefaultCapacityPerTimeSlotEvent> {
  map(event: UpdatePlanDefaultCapacityPerTimeSlotEvent): MixpanelEvent {
    return new MixpanelEvent('update_plan_default_capacity_per_time_slot', event.data);
  }
}
