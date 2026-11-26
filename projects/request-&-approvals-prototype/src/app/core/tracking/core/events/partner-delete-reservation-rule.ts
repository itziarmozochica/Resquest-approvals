import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface PartnerDeleteReservationRuleData {
  business_type: string;
  deleted_by: string;
  deleted_fields: string[];
  partner_id: number;
  user_id: number;
}

export class PartnerDeleteReservationRuleEvent extends TrackingEvent<PartnerDeleteReservationRuleData> {
  constructor(readonly data: PartnerDeleteReservationRuleData) {
    super(TrackingEvents.PartnerDeleteReservationRule, data);
  }
}
