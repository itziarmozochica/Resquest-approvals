import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ReservationNoteData } from './reservation-note.model';

export class CreateReservationNoteEvent extends TrackingEvent<ReservationNoteData> {
  constructor(readonly data: ReservationNoteData) {
    super(TrackingEvents.CreateReservationNote, data);
  }
}
