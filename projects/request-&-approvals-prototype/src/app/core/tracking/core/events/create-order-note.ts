import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { OrderNoteData } from './order-note.model';

export class CreateOrderNoteEvent extends TrackingEvent<OrderNoteData> {
  constructor(readonly data: OrderNoteData) {
    super(TrackingEvents.CreateOrderNote, data);
  }
}
