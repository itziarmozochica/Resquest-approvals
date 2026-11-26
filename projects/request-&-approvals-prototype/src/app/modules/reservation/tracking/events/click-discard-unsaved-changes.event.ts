import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export interface ClickDiscardUnsavedChangesData extends ModifyReservationEventData {
  screen: string;
}

export const clickDiscardUnsavedChanges = defineEvent<ClickDiscardUnsavedChangesData>('click.discardUnsavedChanges');
