import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface ModifyReservationTicketLineRemoveData extends DepositTrackingContext {
  cartId: string;
  previousQuantity: number;
  quantity: number;
  reservationId: string;
  sessionId: number;
  sessionTypeId: number;
}

export const modifyReservationTicketLineRemove = defineEvent<ModifyReservationTicketLineRemoveData>('reservation.modify.ticketLineRemove');
