import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickMarketingServiceContactData {
  requestedService: string;
}

export class ClickMarketingServiceContactEvent extends TrackingEvent<ClickMarketingServiceContactData> {
  constructor(readonly data: ClickMarketingServiceContactData) {
    super(TrackingEvents.ClickMarketingServiceContact, data);
  }
}
