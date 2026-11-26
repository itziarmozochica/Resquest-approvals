import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateSubAffiliateData {
  sub_affiliate_email: string;
  tracking_code: string;
  partner_id: number;
  reseller_id: number;
}

export class CreateSubAffiliateEvent extends TrackingEvent<CreateSubAffiliateData> {
  constructor(readonly data: CreateSubAffiliateData) {
    super(TrackingEvents.CreateSubAffiliate, data);
  }
}
