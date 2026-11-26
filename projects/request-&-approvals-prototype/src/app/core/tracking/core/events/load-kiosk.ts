import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { LoadTicketingData } from './load-ticketing-data';

export class LoadKioskEvent extends TrackingEvent<LoadTicketingData> {
  constructor(readonly data: LoadTicketingData) {
    super(TrackingEvents.LoadKiosk, data);
  }
}
