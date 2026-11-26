import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ModifyReservationEventData } from '../models/modify-reservation-event-data.model';

export type ClickNewTypeDateData = ModifyReservationEventData;

export const clickNewTypeDate = defineEvent<ClickNewTypeDateData>('click.newTypeDate');
