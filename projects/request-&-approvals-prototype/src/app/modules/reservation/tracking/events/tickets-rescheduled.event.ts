import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type TicketsRescheduledData = ModifyReservationEventData;

export const ticketsRescheduled = defineEvent<TicketsRescheduledData>('reservation.modify.ticketsRescheduled');
