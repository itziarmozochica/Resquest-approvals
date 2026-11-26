import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ClickRescheduleData = ModifyReservationEventData;

export const clickReschedule = defineEvent<ClickRescheduleData>('click.reschedule');
