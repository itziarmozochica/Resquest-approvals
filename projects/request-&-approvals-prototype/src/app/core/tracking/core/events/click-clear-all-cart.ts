import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickClearAllCartData {
  partner_id: number;
  cart_id: string;
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  obo_flow_type?: string;
  channel?: string;
  reservation_flow_type?: ReservationFlowTypeEnum;
  employee_id?: number;
  owner_id?: number;
}

export class ClickClearAllCartEvent extends TrackingEvent<ClickClearAllCartData> {
  constructor(readonly data: ClickClearAllCartData) {
    super(TrackingEvents.ClickClearAllCart, data);
  }
}
