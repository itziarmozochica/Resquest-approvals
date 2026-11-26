import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { OrderNoteData } from './order-note.model';

export class DeleteOrderNoteEvent extends TrackingEvent<OrderNoteData> {
  constructor(readonly data: OrderNoteData) {
    super(TrackingEvents.DeleteOrderNote, data);
  }
}
