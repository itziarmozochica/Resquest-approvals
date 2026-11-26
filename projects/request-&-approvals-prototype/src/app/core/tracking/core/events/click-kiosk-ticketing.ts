import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickKioskTicketingData {
  planId: string;
  venueId: string;
  cityId: string;
}

export class ClickKioskTicketingEvent extends TrackingEvent<ClickKioskTicketingData> {
  constructor(readonly data: ClickKioskTicketingData) {
    super(TrackingEvents.ClickKioskTicketing, data);
  }
}
