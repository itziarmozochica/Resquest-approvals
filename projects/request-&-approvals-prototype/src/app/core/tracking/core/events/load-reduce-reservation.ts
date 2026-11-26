import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { LoadModifyReservationData } from './load-modify-reservation-data';

export class LoadReduceReservationEvent extends TrackingEvent<LoadModifyReservationData> {
  constructor(readonly data: LoadModifyReservationData) {
    super(TrackingEvents.LoadReduceReservation, data);
  }
}
