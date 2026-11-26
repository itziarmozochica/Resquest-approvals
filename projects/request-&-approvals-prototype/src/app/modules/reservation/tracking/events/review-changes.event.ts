import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ReviewChangesData = ModifyReservationEventData;

export const reviewChanges = defineEvent<ReviewChangesData>('click.reviewChanges');
