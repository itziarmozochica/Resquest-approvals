import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ClearAllChangesData = ModifyReservationEventData;

export const clearAllChanges = defineEvent<ClearAllChangesData>('click.clearAllChanges');
