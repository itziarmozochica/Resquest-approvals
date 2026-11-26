import { ExpirationStrategy } from '../../../../modules/reservation/models/expiration-strategy.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface PartnerCreateReservationRuleData {
  business_type: string;
  created_by: string;
  fields_created: {
    field_name: string;
    value: ExpirationStrategy | string | number | null;
  }[];
  partner_id: number;
  user_id: number;
}

export class PartnerCreateReservationRuleEvent extends TrackingEvent<PartnerCreateReservationRuleData> {
  constructor(readonly data: PartnerCreateReservationRuleData) {
    super(TrackingEvents.PartnerCreateReservationRule, data);
  }
}
