import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface ModifyReservationTicketLineIncrementData extends DepositTrackingContext {
  cartId: string;
  previousQuantity: number;
  quantity: number;
  reservationId: string;
  sessionId: number;
  sessionTypeId: number;
  stepQuantity: number;
}

export const modifyReservationTicketLineIncrement = defineEvent<ModifyReservationTicketLineIncrementData>(
  'reservation.modify.ticketLineIncrement',
);
