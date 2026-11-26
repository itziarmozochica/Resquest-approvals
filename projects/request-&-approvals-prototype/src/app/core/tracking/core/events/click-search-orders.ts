import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickSearchOrdersData {
  purchased_at_from: string | null;
  purchased_at_to: string | null;
  channel: string | null;
  city_id: number | null;
  city_name: string | null;
  order_id: number | null;
  full_name: string | null;
}

export class ClickSearchOrdersEvent extends TrackingEvent<ClickSearchOrdersData> {
  constructor(readonly data: ClickSearchOrdersData) {
    super(TrackingEvents.ClickSearchOrders, data);
  }
}
