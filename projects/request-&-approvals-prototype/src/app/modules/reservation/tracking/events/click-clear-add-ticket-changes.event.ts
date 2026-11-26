import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ClickClearAddTicketChangesData = ModifyReservationEventData;

export const clickClearAddTicketChanges = defineEvent<ClickClearAddTicketChangesData>('click.clearAddTicketChanges');
