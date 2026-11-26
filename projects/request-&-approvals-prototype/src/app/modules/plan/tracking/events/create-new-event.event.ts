import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { CreateEventEntryPoint } from '../models/plan-tracking.model';

export interface CreateNewEventData {
  entry_point?: CreateEventEntryPoint;
}

export const createNewEvent = defineEvent<CreateNewEventData>('create.newEvent');
