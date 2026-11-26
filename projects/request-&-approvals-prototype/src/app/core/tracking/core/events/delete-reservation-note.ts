import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ReservationNoteData } from './reservation-note.model';

export class DeleteReservationNoteEvent extends TrackingEvent<ReservationNoteData> {
  constructor(readonly data: ReservationNoteData) {
    super(TrackingEvents.DeleteReservationNote, data);
  }
}
