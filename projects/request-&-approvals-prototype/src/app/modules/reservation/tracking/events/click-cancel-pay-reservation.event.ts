import { PaymentOption } from '@fz-original/app/modules/reservation/models/payment-option.enum';
import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';
import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface ClickCancelPayReservationData extends DepositTrackingContext {
  cartId: string;
  channelId: string;
  paymentOption?: PaymentOption;
  planId: number;
  reservationFlowType: ReservationFlowTypeEnum;
  reservationId: string;
}

export const clickCancelPayReservation = defineEvent<ClickCancelPayReservationData>('click.cancelPayReservation');
