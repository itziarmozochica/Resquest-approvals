import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { ReservationConfirmationActionEnum } from '../../../../modules/reservation/models/reservation-confirmation-action.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadReservationConfirmationData {
  cart_id: string;
  reservation_id: string;
  reservation_locator: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  channel: string;
  business_type?: string;
  action: ReservationConfirmationActionEnum;
  reservation_flow_type?: ReservationFlowTypeEnum;
}

export class LoadReservationConfirmationEvent extends TrackingEvent<LoadReservationConfirmationData> {
  constructor(readonly data: LoadReservationConfirmationData) {
    super(TrackingEvents.LoadReservationConfirmation, data);
  }
}
