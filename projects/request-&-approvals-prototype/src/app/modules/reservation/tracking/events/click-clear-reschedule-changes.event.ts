import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ClickClearRescheduleChangesData = ModifyReservationEventData;

export const clickClearRescheduleChanges = defineEvent<ClickClearRescheduleChangesData>('click.clearRescheduleChanges');
