import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { OrderNoteData } from './order-note.model';

export class EditOrderNoteEvent extends TrackingEvent<OrderNoteData> {
  constructor(readonly data: OrderNoteData) {
    super(TrackingEvents.EditOrderNote, data);
  }
}
