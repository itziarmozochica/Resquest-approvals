import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickNewOrderData {
  city_id: number;
  city_name: string;
  from_order_id: number;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  obo_flow_type?: string;
  channel?: string;
}

export class ClickNewOrderEvent extends TrackingEvent<ClickNewOrderData> {
  constructor(readonly data: ClickNewOrderData) {
    super(TrackingEvents.ClickNewOrder, data);
  }
}
