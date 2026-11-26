import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateModifiedOrderData {
  mode: 'upgrade_seating' | 'add_tickets';
  new_order_id: number;
  original_order_id: number;
}

export class CreateModifiedOrderEvent extends TrackingEvent<CreateModifiedOrderData> {
  constructor(readonly data: CreateModifiedOrderData) {
    super(TrackingEvents.CreateModifiedOrder, data);
  }
}
