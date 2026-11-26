import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface RescheduleOrderData {
  order_id: number;
  payment_gateway: string;
  payment_method: string;
  channel: string;
  is_reservation: boolean;
  paid_by_customer_is_enabled: boolean;
  paid_by_partner_is_enabled: boolean;
  reschedule_type: 'paid_by_customer' | 'paid_by_partner';
  total_amount_variation: number;
  total_tickets_variation: number;
  same_timeslot: boolean;
  same_ticket_types: boolean;
}

export class RescheduleOrderEvent extends TrackingEvent<RescheduleOrderData> {
  constructor(readonly data: RescheduleOrderData) {
    super(TrackingEvents.RescheduleOrder, data);
  }
}
