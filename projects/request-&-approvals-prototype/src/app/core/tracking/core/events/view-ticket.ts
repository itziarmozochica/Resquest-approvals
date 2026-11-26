import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ViewTicketData {
  order_id: number;
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  obo_flow_type?: string;
}

export class ViewTicketEvent extends TrackingEvent<ViewTicketData> {
  constructor(readonly data: ViewTicketData) {
    super(TrackingEvents.ViewTicket, data);
  }
}
