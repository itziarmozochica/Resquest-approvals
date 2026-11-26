import { TimeSlotFilter } from '../../models/template-coupon/time-slot-filter.model';

export interface TemplateCouponSelectionFilters {
  channel_ids: Array<string>;
  city_ids: Array<number>;
  main_plan_ids: Array<number>;
  session_type_ids: Array<number>;
  time_slot_filters?: Array<TimeSlotFilter>;
}
