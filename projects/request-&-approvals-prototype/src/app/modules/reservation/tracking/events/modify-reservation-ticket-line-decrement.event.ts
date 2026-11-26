import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { ModifyReservationTicketLineIncrementData } from './modify-reservation-ticket-line-increment.event';

export type ModifyReservationTicketLineDecrementData = ModifyReservationTicketLineIncrementData;

export const modifyReservationTicketLineDecrement = defineEvent<ModifyReservationTicketLineDecrementData>(
  'reservation.modify.ticketLineDecrement',
);
