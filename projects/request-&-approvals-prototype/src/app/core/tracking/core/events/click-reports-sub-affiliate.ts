import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReportsSubAffiliateData {
  role: string;
  affiliate_id?: number;
}

export class ClickReportsSubAffiliateEvent extends TrackingEvent<ClickReportsSubAffiliateData> {
  constructor(readonly data: ClickReportsSubAffiliateData) {
    super(TrackingEvents.ClickReportsSubAffiliate, data);
  }
}
