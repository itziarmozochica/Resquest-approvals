import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ClickBackToModificationData = ModifyReservationEventData;

export const clickBackToModification = defineEvent<ClickBackToModificationData>('click.backToModification');
