import { InventoryScheduleTimeSlotRecurrencyEvent } from '../../core/events/inventory-schedule-time-slot-recurrency';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InventoryScheduleTimeSlotRecurrencyMapper implements MixpanelTrackingMapper<InventoryScheduleTimeSlotRecurrencyEvent> {
  map(event: InventoryScheduleTimeSlotRecurrencyEvent): MixpanelEvent {
    return new MixpanelEvent('inventory_schedule_time_slot_recurrency', event.data);
  }
}
