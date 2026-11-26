import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { LoadTicketingData } from './load-ticketing-data';

export class LoadMakeReservationEvent extends TrackingEvent<LoadTicketingData> {
  constructor(readonly data: LoadTicketingData) {
    super(TrackingEvents.LoadMakeReservation, data);
  }
}
