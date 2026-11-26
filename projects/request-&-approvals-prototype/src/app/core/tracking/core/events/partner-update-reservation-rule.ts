import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { FieldUpdate } from './field-update';

export interface PartnerUpdateReservationRuleData {
  business_type: string;
  changes_made: FieldUpdate[];
  partner_id: number;
  updated_by: string;
  user_id: number;
}

export class PartnerUpdateReservationRuleEvent extends TrackingEvent<PartnerUpdateReservationRuleData> {
  constructor(readonly data: PartnerUpdateReservationRuleData) {
    super(TrackingEvents.PartnerUpdateReservationRule, data);
  }
}
