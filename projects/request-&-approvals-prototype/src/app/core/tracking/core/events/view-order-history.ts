import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ViewOrderHistoryData {
  order_id: number;
  cancellation_record_count: number;
}

export class ViewOrderHistoryEvent extends TrackingEvent<ViewOrderHistoryData> {
  constructor(readonly data: ViewOrderHistoryData) {
    super(TrackingEvents.ViewOrderHistory, data);
  }
}
