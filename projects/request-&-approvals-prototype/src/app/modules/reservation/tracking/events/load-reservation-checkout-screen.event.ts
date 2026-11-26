import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface LoadReservationCheckoutScreenData extends DepositTrackingContext {
  cartId: string;
  channelId: string;
  planId: number;
  reservationFlowType: ReservationFlowTypeEnum;
  reservationId: string | null;
}

export const loadReservationCheckoutScreen = defineEvent<LoadReservationCheckoutScreenData>('load.reservationCheckoutScreen');
