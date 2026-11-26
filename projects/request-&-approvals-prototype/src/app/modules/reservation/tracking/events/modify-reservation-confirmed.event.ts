import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface ModifyReservationConfirmedData extends DepositTrackingContext {
  cartId: string;
  errorCode: string | number | null;
  modifyAction: string;
  reservationId: string;
  result: 'error' | 'success';
}

export const modifyReservationConfirmed = defineEvent<ModifyReservationConfirmedData>('reservation.modify.confirmed');
