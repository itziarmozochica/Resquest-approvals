import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickMarketingServiceMoreInfoData {
  requestedService: string;
}

export class ClickMarketingServiceMoreInfoEvent extends TrackingEvent<ClickMarketingServiceMoreInfoData> {
  constructor(readonly data: ClickMarketingServiceMoreInfoData) {
    super(TrackingEvents.ClickMarketingServiceMoreInfo, data);
  }
}
