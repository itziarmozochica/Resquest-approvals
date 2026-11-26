import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateOrderData {
  cart_id: string;
  city_id: number;
  city_name: string;
  currency: string;
  customer_id: number | null | undefined;
  event_date: string;
  order_id: number | undefined;
  payment_type: string;
  payment_transaction_id: string | null | undefined;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  total_purchased_tickets: number;
  total: number;
  total_surcharge: number;
  coupon_code?: string | null;
  payment_provider?: string;
  integration_mode?: string | null;
  purchase_source?: string; //Deprecated
  channel?: string;
  using_cash_calculator: boolean;
  reservation_id?: string;
  obo_flow_type?: string;
  feverzone_user: string;
  has_seats?: boolean;
  has_multi_time_slot?: boolean;
  has_multi_plan?: boolean;
}

export class CreateOrderEvent extends TrackingEvent<CreateOrderData> {
  constructor(readonly data: CreateOrderData) {
    super(TrackingEvents.CreateOrder, data);
  }
}
