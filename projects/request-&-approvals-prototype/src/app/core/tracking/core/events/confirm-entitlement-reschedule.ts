import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type ConfirmEntitlementRescheduleResult = 'error' | 'ok';

export interface ConfirmEntitlementRescheduleData {
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  order_id: number;
  result: ConfirmEntitlementRescheduleResult;
  target_session_ids: number[];
  ticket_ids: number[];
  tickets_count: number;
}

export class ConfirmEntitlementRescheduleEvent extends TrackingEvent<ConfirmEntitlementRescheduleData> {
  constructor(readonly data: ConfirmEntitlementRescheduleData) {
    super(TrackingEvents.ConfirmEntitlementReschedule, data);
  }
}
