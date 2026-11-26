import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export interface NewTypeDateAddedData extends ModifyReservationEventData {
  numberOfDatesAdded: number;
  numberOfTicketsAdded: number;
}

export const newTypeDateAdded = defineEvent<NewTypeDateAddedData>('reservation.modify.newTypeDateAdded');
