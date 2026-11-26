import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOrderData {
  order_id: number;
}

export class ClickOrderEvent extends TrackingEvent<ClickOrderData> {
  constructor(readonly data: ClickOrderData) {
    super(TrackingEvents.ClickOrder, data);
  }
}
